const SUPABASE_URL = "https://pxdhqwiztigwqzrzummo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pVDRTFYOulR0QuQ1lcl9MA_vEYBr00-";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const pageShell = document.querySelector(".page-shell");
const authContainer = document.getElementById("authContainer");
const lessonsContainer = document.getElementById("lessonsContainer");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggleLink = document.getElementById("authToggleLink");
const authMessage = document.getElementById("authMessage");
const fullNameGroup = document.getElementById("fullNameGroup");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const fullNameInput = document.getElementById("fullNameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const logoutButton = document.getElementById("logoutBtn");

const fallbackLessons = [
  {
    title: "Variables and data types",
    lesson_number: 1,
    description: "An introduction to variables, strings, numbers, and booleans in JavaScript.",
    file_url: "https://example.com/lesson-01.pdf",
    created_at: "2026-07-10T08:00:00.000Z"
  }
];

let authMode = "login";

function formatDisplayDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function getFileIcon(fileName) {
  const extension = String(fileName).split('.').pop().toLowerCase();
  if (["png", "jpg", "jpeg", "svg", "gif", "bmp", "webp"].includes(extension)) return "🖼️";
  if (["html", "css", "js", "json", "jsx", "ts", "tsx", "md", "py", "java", "c", "cpp", "cs", "rb", "php"].includes(extension)) return "🌐";
  if (["zip", "rar", "tar", "gz", "7z", "bz2"].includes(extension)) return "📦";
  if (extension === "pdf") return "📕";
  return "📄";
}

function createLessonCard(lesson) {
  const title = lesson.title || "Untitled lesson";
  const description = lesson.description || "No description available.";
  const lessonNumber = lesson.lesson_number
    ? `Lesson ${String(lesson.lesson_number).padStart(2, "0")}`
    : "Lesson 01";
  const fileUrl = lesson.file_url || "#";
  const fileName = fileUrl === "#"
    ? "File unavailable"
    : fileUrl.split("/").pop() || "lesson.pdf";
  const createdAt = formatDisplayDate(lesson.created_at);

  return `
    <article class="lesson-card">
      <div class="lesson-card__header">
        <span class="lesson-card__badge">${lessonNumber}</span>
        <h3 class="lesson-card__title">${title}</h3>
      </div>
      <div class="lesson-card__meta">
        <div class="lesson-card__date">Uploaded: ${createdAt}</div>
        <p class="lesson-card__description">${description}</p>
      </div>
      <div class="lesson-card__footer">
        <a class="lesson-card__file" href="${fileUrl}" target="_blank" rel="noopener noreferrer">
          <span class="lesson-card__icon">${getFileIcon(fileName)}</span>
          <span class="lesson-card__filename">${fileName}</span>
        </a>
        <a class="lesson-card__download" href="${fileUrl}" download="${fileName}">Download</a>
      </div>
    </article>
  `;
}

function renderLessons(lessons) {
  if (!lessons || !lessons.length) {
    lessonsContainer.innerHTML = '<div class="empty-state">No lessons available yet.</div>';
    return;
  }

  lessonsContainer.innerHTML = lessons.map(createLessonCard).join("");
}

function clearAuthMessage() {
  if (authMessage) {
    authMessage.textContent = "";
    authMessage.className = "auth-form__message";
  }
}

function showAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function getAuthErrorMessage(error) {
  const message = error?.message || "";

  if (/invalid login|invalid_credentials|email or password/i.test(message)) {
    return "The email or password is incorrect.";
  }

  if (/already registered|user already/i.test(message)) {
    return "This email is already registered.";
  }

  if (/email.*confirm|confirm your email|email_not_confirmed/i.test(message)) {
    return "Please confirm your email before signing in.";
  }

  if (/password/i.test(message)) {
    return "The password must be at least 6 characters long.";
  }

  if (/network|fetch|failed/i.test(message)) {
    return "The connection to the server failed. Please try again.";
  }

  return "An error occurred while signing in or signing up.";
}

function setAuthMode(mode) {
  authMode = mode;

  if (fullNameGroup) {
    fullNameGroup.classList.toggle("auth-form__field--hidden", mode !== "signup");
  }

  if (confirmPasswordGroup) {
    confirmPasswordGroup.classList.toggle("auth-form__field--hidden", mode !== "signup");
  }

  if (authTitle) {
    authTitle.textContent = mode === "signup" ? "Create an account" : "Sign in";
  }

  if (authSubmitBtn) {
    authSubmitBtn.textContent = mode === "signup" ? "Sign up" : "Sign in";
  }

  if (authToggleLink) {
    authToggleLink.textContent = mode === "signup"
      ? "Already have an account? Sign in"
      : "Need an account? Sign up";
  }

  clearAuthMessage();
  if (authForm) {
    authForm.reset();
  }
}

function showAuthScreen() {
  if (pageShell) pageShell.hidden = true;
  if (authContainer) authContainer.hidden = false;
  if (logoutButton) logoutButton.hidden = true;
  lessonsContainer.innerHTML = "";
}

function showPortalScreen() {
  if (pageShell) pageShell.hidden = false;
  if (authContainer) authContainer.hidden = true;
  if (logoutButton) logoutButton.hidden = false;
  lessonsContainer.innerHTML = '<div class="empty-state">Loading lessons...</div>';
}

async function fetchLessons() {
  if (!supabaseClient) {
    renderLessons(fallbackLessons);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .select("title, lesson_number, description, file_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderLessons(data || []);
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    renderLessons(fallbackLessons);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearAuthMessage();

  const fullName = fullNameInput?.value.trim() || "";
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  const confirmPassword = confirmPasswordInput?.value || "";

  if (!fullName || !email || !password) {
    showAuthMessage("Please fill in every field.", true);
    return;
  }

  if (password !== confirmPassword) {
    showAuthMessage("The password and confirmation do not match.", true);
    return;
  }

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    if (!data?.user) {
      throw new Error("Registration was not completed.");
    }

    const { error: profileError } = await supabaseClient.from("profiles").insert([
      {
        id: data.user.id,
        full_name: fullName,
        email,
        is_approved: false
      }
    ]);

    if (profileError) throw profileError;

    showAuthMessage("Registration complete. Please confirm your email and wait for teacher approval.", false);
    authForm.reset();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearAuthMessage();

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  if (!email || !password) {
    showAuthMessage("Please enter your email and password.", true);
    return;
  }

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  if (authSubmitBtn) {
    authSubmitBtn.disabled = true;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data?.user;
    if (!user) {
      throw new Error("Sign in was not completed.");
    }

    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showAuthMessage("Your account is still waiting for teacher approval.", true);
      return;
    }

    showPortalScreen();
    await fetchLessons();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
    }
  }
}

async function handleAuthSubmit(event) {
  if (authMode === "signup") {
    await handleSignup(event);
    return;
  }

  await handleLogin(event);
}

async function handleLogout() {
  if (!supabaseClient) return;

  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }

  showAuthScreen();
  setAuthMode("login");
}

async function handleAuthStateChange(_event, session) {
  if (!session) {
    showAuthScreen();
    return;
  }

  if (!supabaseClient) {
    return;
  }

  try {
    const user = session.user;
    const { data: profileData, error } = await supabaseClient
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .single();

    if (error || !profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showAuthScreen();
      showAuthMessage("Your account is still waiting for teacher approval.", true);
      return;
    }

    showPortalScreen();
    await fetchLessons();
  } catch (error) {
    console.error("Auth state check failed:", error);
    showAuthScreen();
  }
}

function attachEvents() {
  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  if (authToggleLink) {
    authToggleLink.addEventListener("click", () => {
      setAuthMode(authMode === "login" ? "signup" : "login");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  setAuthMode("login");
  showAuthScreen();

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange(_event, session);
  });

  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    handleAuthStateChange("INITIAL_SESSION", session);
  });
});
