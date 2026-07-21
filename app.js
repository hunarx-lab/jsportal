const SUPABASE_URL = "https://pxdhqwiztigwqzrzummo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pVDRTFYOulR0QuQ1lcl9MA_vEYBr00-";

const lessonsContainer = document.getElementById("lessonsContainer");
const authModal = document.getElementById("authModal");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggleLink = document.getElementById("authToggleLink");
const authMessage = document.getElementById("authMessage");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const logoutButton = document.getElementById("logoutBtn");
const content = document.getElementById("content");
const fullNameInput = document.getElementById("fullNameInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");

const supabaseClient =
  typeof supabase !== "undefined" && typeof supabase.createClient === "function"
    ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const fallbackLessons = [
  {
    title: "Variables and data types",
    lesson_number: 1,
    description: "An introduction to variables, strings, numbers, and booleans in JavaScript.",
    file_url: "https://example.com/lesson-01.pdf",
    created_at: "2026-07-10T08:00:00.000Z"
  }
];

function formatDisplayDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric" }).format(date);
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
  const lessonNumber = lesson.lesson_number ? `Lesson ${String(lesson.lesson_number).padStart(2, "0")}` : "Lesson 01";
  const fileUrl = lesson.file_url || "#";
  const fileName = fileUrl === "#" ? "File unavailable" : fileUrl.split("/").pop() || "lesson.pdf";
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

let authMode = "login";

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
  if (/invalid login|invalid_credentials|email or password/i.test(message)) return "The email or password is incorrect.";
  if (/already registered|user already/i.test(message)) return "This email is already registered.";
  if (/password/i.test(message)) return "The password must be at least 6 characters long.";
  if (/network|fetch|failed/i.test(message)) return "The connection to the server failed. Please try again.";
  return "An error occurred while communicating with the server.";
}

function setAuthMode(mode) {
  authMode = mode;
  if (!authTitle || !authSubmitBtn || !authToggleLink) return;

  if (mode === "signup") {
    authTitle.textContent = "Create an account";
    authSubmitBtn.textContent = "Sign up";
    authToggleLink.textContent = "Already have an account? Sign in";
    if (fullNameInput) fullNameInput.parentElement.style.display = "block";
    if (confirmPasswordInput) confirmPasswordInput.parentElement.style.display = "block";
  } else {
    authTitle.textContent = "Sign in";
    authSubmitBtn.textContent = "Sign in";
    authToggleLink.textContent = "Need an account? Sign up";
    if (fullNameInput) fullNameInput.parentElement.style.display = "none";
    if (confirmPasswordInput) confirmPasswordInput.parentElement.style.display = "none";
  }

  clearAuthMessage();
  if (authForm) authForm.reset();
}

function showUnauthenticatedState() {
  if (authModal) authModal.hidden = false;
  if (content) content.hidden = true;
  if (logoutButton) logoutButton.hidden = true;
  lessonsContainer.innerHTML = "";
}

function showAuthenticatedState() {
  if (authModal) authModal.hidden = true;
  if (content) content.hidden = false;
  if (logoutButton) logoutButton.hidden = false;
}

async function fetchLessons() {
  if (!supabaseClient) {
    renderLessons(fallbackLessons);
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .select("title, lesson_number, description, file_url")
    if (error) throw error;
    renderLessons(data || []);
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    renderLessons(fallbackLessons);
  }
}

async function checkUserApproval(user) {
  try {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("is_approved")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      showAuthMessage("Your account is waiting for teacher approval.", true);
      await supabaseClient.auth.signOut();
      showUnauthenticatedState();
      return;
    }

    if (profile.is_approved) {
      showAuthenticatedState();
      await fetchLessons();
    } else {
      showAuthMessage("Your account has been created but is still waiting for teacher approval.", true);
      await supabaseClient.auth.signOut();
      showUnauthenticatedState();
    }
  } catch (err) {
    console.error(err);
    await supabaseClient.auth.signOut();
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value.trim() || "";
  const fullName = fullNameInput?.value.trim() || "";
  const confirmPassword = confirmPasswordInput?.value.trim() || "";

  if (!email || !password) {
    showAuthMessage("Please enter your email and password.", true);
    return;
  }

  if (!supabaseClient) return;
  if (authSubmitBtn) authSubmitBtn.disabled = true;

  try {
    if (authMode === "signup") {
      if (!fullName) {
        showAuthMessage("Please enter your full name.", true);
        return;
      }
      if (password !== confirmPassword) {
        showAuthMessage("The password and confirmation do not match.", true);
        return;
      }

      const { data, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: dbError } = await supabaseClient.from("profiles").insert([
          { id: data.user.id, full_name: fullName, email: email, is_approved: false }
        ]);

        if (dbError) throw dbError;

        showAuthMessage("Registration complete. Your account will become active after teacher approval.", false);
        if (authForm) authForm.reset();
      }
      return;
    }

    const { data, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;

    if (data.user) {
      await checkUserApproval(data.user);
    }
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) authSubmitBtn.disabled = false;
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  showUnauthenticatedState();
}

function attachAuthEvents() {
  if (authForm) authForm.addEventListener("submit", handleAuthSubmit);
  if (logoutButton) logoutButton.addEventListener("click", handleLogout);
  if (authToggleLink) {
    authToggleLink.addEventListener("click", (event) => {
      event.preventDefault();
      setAuthMode(authMode === "login" ? "signup" : "login");
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  attachAuthEvents();
  setAuthMode("login");
  showUnauthenticatedState();

  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    await checkUserApproval(session.user);
  }
});