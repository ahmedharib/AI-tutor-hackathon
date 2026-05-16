import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Load your API key securely
load_dotenv()

app = FastAPI()

# Allow the Next.js frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to the Chroma database you built in Phase 1
embeddings = OpenAIEmbeddings()
db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)

# Initialize the LLM (GPT-4o-mini is fast and cheap for hackathons)
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

# Define the structure of the incoming request from the frontend
class ChatRequest(BaseModel):
    message: str
    subject: str
    week: int
    user_id: str = "student_1" # Hardcoded for the prototype demo

# Task 5: Hackathon Shortcut for Learning Memory
# In a production app, this would be fetched from Supabase.
# For the demo, this proves the AI adapts to the user over time.
student_memory = {
    "student_1": "The student learns best with practical examples and short, bulleted lists. They struggle with dense text blocks. Keep answers encouraging and concise."
}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # TASK 4: Exact Metadata Filtering
        # This guarantees the AI only retrieves data for the specific tab the user is on
        search_kwargs = {
            "filter": {
                "$and": [
                    {"subject": {"$eq": request.subject}},
                    {"week": {"$eq": request.week}}
                ]
            },
            "k": 3 # Fetch top 3 most relevant chunks of text
        }

        # Retrieve the filtered context from the vector database
        docs = db.similarity_search(request.message, **search_kwargs)
        context = "\n\n".join([doc.page_content for doc in docs])

        # Fetch the student's personalized learning profile
        learning_profile = student_memory.get(request.user_id, "Standard student profile.")

        # Build the strict instructional prompt
        template = """You are an expert AI tutor locked onto a specific university subject.

        Student Learning Profile: {learning_profile}

        Course Material Context:
        {context}

        User Question: {question}

        INSTRUCTIONS:
        1. Answer the question using ONLY the provided Course Material Context.
        2. Adapt your teaching style exactly to the Student Learning Profile.
        3. If the user asks a question entirely unrelated to the Context, politely inform them that you are currently locked onto this specific week's topic and redirect them.
        """

        prompt = ChatPromptTemplate.from_template(template)

        # Chain the logic together
        chain = prompt | llm | StrOutputParser()

        # Generate the AI response
        response = chain.invoke({
            "learning_profile": learning_profile,
            "context": context,
            "question": request.message
        })

        # Return the response, plus the metadata to prove to the judges it filtered correctly
        return {
            "response": response,
            "metadata_used": [doc.metadata for doc in docs]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))