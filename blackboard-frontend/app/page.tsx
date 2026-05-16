"use client";

import { useState, useRef, useEffect } from "react";
import { Send, BookOpen, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";

// The curriculum structure to generate the sidebar
const syllabus = {
  Mathematics: [1, 2, 3, 4],
  Physics: [1, 2, 3, 4],
  "Discrete Mathematics": [1, 2, 3, 4],
  "Linear Algebra": [1, 2, 3, 4],
};

type Message = { role: "user" | "ai"; content: string };

export default function Home() {
  // Navigation State
  const [activeSubject, setActiveSubject] = useState("Linear Algebra");
  const [activeWeek, setActiveWeek] = useState(4);

  // Navigation State & ID Generation
  const currentTabId = `${activeSubject}-${activeWeek}`;

  // Phase 2: Local Storage Initialization
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>(
    {},
  );
  const [isMounted, setIsMounted] = useState(false);

  // LOAD from Local Storage on initial page load
  useEffect(() => {
    const savedData = localStorage.getItem("blackboard_ai_memory");
    if (savedData) {
      try {
        setChatHistories(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse memory", e);
      }
    }
    setIsMounted(true); // Tell the app it's safe to start saving
  }, []);

  // SAVE to Local Storage whenever chatHistories changes
  useEffect(() => {
    // We only save if the app is fully mounted so we don't accidentally overwrite
    // the saved data with an empty object during initial render!
    if (isMounted) {
      localStorage.setItem(
        "blackboard_ai_memory",
        JSON.stringify(chatHistories),
      );
    }
  }, [chatHistories, isMounted]);

  // Derived State (Only load messages if mounted to avoid SSR flash)
  const currentMessages = isMounted ? chatHistories[currentTabId] || [] : [];

  // Chat UI State
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // TASK 4: Update the Send Function to target specific tabs
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");

    // Add user message to this specific tab's history
    setChatHistories((prev) => ({
      ...prev,
      [currentTabId]: [
        ...(prev[currentTabId] || []),
        { role: "user", content: userMsg },
      ],
    }));

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          subject: activeSubject,
          week: activeWeek,
          user_id: "student_1",
        }),
      });

      const data = await response.json();

      // Add AI response to this specific tab's history
      setChatHistories((prev) => ({
        ...prev,
        [currentTabId]: [
          ...(prev[currentTabId] || []),
          { role: "ai", content: data.response },
        ],
      }));
    } catch (error) {
      console.error("Failed to fetch response", error);
      setChatHistories((prev) => ({
        ...prev,
        [currentTabId]: [
          ...(prev[currentTabId] || []),
          {
            role: "ai",
            content: "Error: Could not connect to the Blackboard Brain.",
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* UI Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-4 bg-slate-950 font-bold text-xl border-b border-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" />
          Blackboard AI
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.entries(syllabus).map(([subject, weeks]) => (
            <div key={subject}>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {subject}
              </h2>
              <ul className="space-y-1">
                {weeks.map((week) => {
                  const isActive =
                    activeSubject === subject && activeWeek === week;
                  return (
                    <li key={`${subject}-${week}`}>
                      <button
                        onClick={() => {
                          setActiveSubject(subject);
                          setActiveWeek(week);
                          // NOTICE: We removed setMessages([]) from here so memory stays intact!
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white font-medium"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Week {week}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Status Bar */}
        <div className="h-14 bg-white border-b flex items-center px-6 shadow-sm z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            <Lock className="w-4 h-4 text-blue-600" />
            AI Locked:{" "}
            <span className="text-slate-900">
              {activeSubject} — Week {activeWeek}
            </span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <BookOpen className="w-16 h-16 text-slate-200" />
              <p>
                Ask a question about {activeSubject}, Week {activeWeek}.
              </p>
            </div>
          ) : (
            currentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about Week ${activeWeek} of ${activeSubject}...`}
              className="flex-1 rounded-xl border-slate-300 border bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white rounded-xl px-5 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
