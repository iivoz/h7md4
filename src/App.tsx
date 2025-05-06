import React, { useState, useEffect } from "react";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { translations, Language } from "./lib/translations";

type ColorType = {
  class: string;
  labelKey: keyof typeof translations.ar.colors;
  icon: string;
};

const COLORS: ColorType[] = [
  {
    class: "bg-red-100 dark:bg-red-900",
    labelKey: "urgent",
    icon: "🔥"
  },
  {
    class: "bg-yellow-100 dark:bg-yellow-900",
    labelKey: "important",
    icon: "⭐"
  },
  {
    class: "bg-blue-100 dark:bg-blue-900",
    labelKey: "project",
    icon: "📋"
  },
  {
    class: "bg-green-100 dark:bg-green-900",
    labelKey: "personal",
    icon: "🎯"
  },
  {
    class: "bg-purple-100 dark:bg-purple-900",
    labelKey: "creative",
    icon: "💡"
  },
];

function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && savedLang in translations) {
        return savedLang;
      }
      // Try to detect user's language
      const userLang = navigator.language.split('-')[0];
      const supportedLangs: Record<string, Language> = {
        ar: 'ar',
        ur: 'ur',
        hi: 'hi',
        tr: 'tr',
        fa: 'fa',
        zh: 'zh',
        ja: 'ja',
        en: 'en'
      };
      return supportedLangs[userLang] || 'en';
    }
    return 'en';
  });

  const t = translations[language];

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = ['ar', 'ur', 'fa'].includes(language) ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <div className={`min-h-screen flex flex-col dark:bg-gray-900 transition-colors duration-200 ${['ar', 'ur', 'fa'].includes(language) ? 'rtl' : 'ltr'}`}>
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 flex justify-between items-center border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">{t.title}</h2>
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-gray-100 dark:bg-gray-800 border-0 rounded-lg p-2 cursor-pointer"
          >
            <option value="ar">العربية</option>
            <option value="ur">اردو</option>
            <option value="hi">हिन्दी</option>
            <option value="tr">Türkçe</option>
            <option value="fa">فارسی</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="w-full max-w-6xl mx-auto">
          <Content language={language} />
        </div>
      </main>
      <Toaster theme={isDark ? "dark" : "light"} />
    </div>
  );
}

function Content({ language }: { language: Language }) {
  const t = translations[language];
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const tasks = useQuery(api.tasks.get);
  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const updateReminder = useMutation(api.tasks.updateReminder);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].class);
  const [reminderDate, setReminderDate] = useState("");

  useEffect(() => {
    // Check for due reminders every minute
    const interval = setInterval(() => {
      if (tasks) {
        const now = Date.now();
        tasks.forEach(task => {
          if (task.reminderTime && task.reminderTime <= now) {
            toast.info(`${t.reminder}: ${task.title}`, {
              description: ['ar', 'ur', 'fa'].includes(language) ? "حان موعد المهمة!" : "Task is due now!"
            });
          }
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks, language, t]);

  if (loggedInUser === undefined || tasks === undefined) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const columns = {
    todo: tasks?.filter((t) => t.status === "todo") ?? [],
    inProgress: tasks?.filter((t) => t.status === "inProgress") ?? [],
    done: tasks?.filter((t) => t.status === "done") ?? [],
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await createTask({
        title: newTaskTitle,
        status: "todo",
        color: selectedColor,
        reminderTime: reminderDate ? new Date(reminderDate).getTime() : undefined,
      });
      setNewTaskTitle("");
      setReminderDate("");
      toast.success(t.taskAdded);
    } catch (error) {
      toast.error(t.error);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    try {
      await updateTaskStatus({ taskId: taskId as any, status });
      toast.success(t.taskUpdated);
    } catch (error) {
      toast.error(t.error);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">{t.title}</h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">{t.tagline}</p>
            <div className="flex gap-4 justify-center items-center text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">{t.features.smartCategories}</span>
              <span className="flex items-center gap-1">{t.features.reminders}</span>
              <span className="flex items-center gap-1">{t.features.colorOrganization}</span>
            </div>
          </div>
          <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div>
          <form onSubmit={handleCreateTask} className="mb-8 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder={t.addTask}
                className="flex-1 max-w-sm p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <button
                type="submit"
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
                disabled={!newTaskTitle.trim()}
              >
                {t.add}
              </button>
            </div>
            <div className="flex gap-4">
              {COLORS.map((color) => (
                <button
                  key={color.class}
                  type="button"
                  onClick={() => setSelectedColor(color.class)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    selectedColor === color.class ? color.class + " ring-2 ring-offset-2 ring-indigo-500" : "bg-gray-50 dark:bg-gray-800 hover:" + color.class
                  }`}
                >
                  <span className="text-xl">{color.icon}</span>
                  <span className="text-xs font-medium">{t.colors[color.labelKey]}</span>
                </button>
              ))}
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "todo")}
            >
              <h3 className="font-bold mb-4 dark:text-white">{t.todo}</h3>
              {columns.todo.map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  className={`${task.color || 'bg-white dark:bg-gray-700'} p-3 rounded shadow mb-2 cursor-move dark:text-white`}
                >
                  <div className="flex justify-between items-start">
                    <span>{task.title}</span>
                    {task.reminderTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.reminderTime).toLocaleString(['ar', 'ur', 'fa'].includes(language) ? 'ar-SA' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "inProgress")}
            >
              <h3 className="font-bold mb-4 dark:text-white">{t.inProgress}</h3>
              {columns.inProgress.map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  className={`${task.color || 'bg-white dark:bg-gray-700'} p-3 rounded shadow mb-2 cursor-move dark:text-white`}
                >
                  <div className="flex justify-between items-start">
                    <span>{task.title}</span>
                    {task.reminderTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.reminderTime).toLocaleString(['ar', 'ur', 'fa'].includes(language) ? 'ar-SA' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "done")}
            >
              <h3 className="font-bold mb-4 dark:text-white">{t.done}</h3>
              {columns.done.map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  className={`${task.color || 'bg-white dark:bg-gray-700'} p-3 rounded shadow mb-2 cursor-move dark:text-white`}
                >
                  <div className="flex justify-between items-start">
                    <span>{task.title}</span>
                    {task.reminderTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(task.reminderTime).toLocaleString(['ar', 'ur', 'fa'].includes(language) ? 'ar-SA' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Authenticated>
    </div>
  );
}

export default App;
