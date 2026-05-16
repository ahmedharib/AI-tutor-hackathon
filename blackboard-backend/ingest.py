import os
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

load_dotenv()

# 1. Manually structure the parsed data for the prototype
# In a full app, an LLM could extract this from the raw PDF text,
# but structuring it like this guarantees your demo will not fail.
syllabus_data = {
    "Mathematics": {
        1: "Limits, Continuity, and Asymptotes",
        2: "Applications of Derivatives and Optimization",
        3: "Techniques of Integration",
        4: "Multivariable Functions and Partial Derivatives"
    },
    "Physics": {
        1: "Classical Mechanics and Kinematics",
        2: "Thermodynamics and Heat Transfer",
        3: "Electromagnetism and Maxwell's Equations",
        4: "Introduction to Quantum Mechanics"
    },
    "Discrete Mathematics": {
        1: "Propositional Logic and Boolean Algebra",
        2: "Set Theory and Mathematical Induction",
        3: "Graph Theory and Trees",
        4: "Combinatorics and Permutations"
    },
    "Linear Algebra": {
        1: "Systems of Linear Equations and Matrices",
        2: "Vector Spaces and Subspaces",
        3: "Linear Transformations and Change of Basis",
        4: "Eigenvalues, Eigenvectors, and Diagonalization"
    }
}

def generate_mock_content(subject, week, topic):
    """
    Since your PDF only contains the titles, we generate mock course material
    for the AI to read. In the final version, this would be the actual textbook
    or lecture transcript text.
    """
    return f"This is the core study material for {subject}, Week {week}. The primary focus is {topic}. Students must understand the foundational principles of {topic} to pass the module."

def parse_curriculum():
    parsed_documents = []

    for subject, weeks in syllabus_data.items():
        for week_num, topic in weeks.items():
            # Generate the content payload
            content = generate_mock_content(subject, week_num, topic)

            parsed_documents.append({
                "subject": subject,
                "week": week_num,
                "topic": topic,
                "content": content
            })

    return parsed_documents

api_key = os.getenv("OPENAI_API_KEY")

def load_into_vector_db(parsed_docs):
    # Initialize text splitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    documents = []
    metadatas = []

    for item in parsed_docs:
        # Split the mock content
        chunks = text_splitter.split_text(item["content"])

        for chunk in chunks:
            documents.append(chunk)

            # CRITICAL: This is the exact metadata your Next.js frontend will use
            # to lock the AI into a specific tab.
            metadatas.append({
                "subject": item["subject"],
                "week": item["week"],
                "topic": item["topic"]
            })

    # Initialize local ChromaDB instance
    db = Chroma.from_texts(
        texts=documents,
        embedding=OpenAIEmbeddings(),
        metadatas=metadatas,
        persist_directory="./chroma_db"
    )

    print(f"Success! Indexed {len(documents)} context chunks into ChromaDB.")
    print("Database is ready for Phase 2.")

# Execution block
if __name__ == "__main__":
    print("Extracting curriculum...")
    data = parse_curriculum()

    print("Loading into Vector Database...")
    load_into_vector_db(data)