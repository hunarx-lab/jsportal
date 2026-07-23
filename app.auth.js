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
const approvalState = document.getElementById("approvalState");
const approvalTitle = document.getElementById("approvalTitle");
const approvalMessage = document.getElementById("approvalMessage");
const approvalBackBtn = document.getElementById("approvalBackBtn");
const fullNameGroup = document.getElementById("fullNameGroup");
const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
const fullNameInput = document.getElementById("fullNameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const forgotPasswordEmailInput = document.getElementById("forgotPasswordEmailInput");
const forgotPasswordSubmitBtn = document.getElementById("forgotPasswordSubmitBtn");
const forgotMessage = document.getElementById("forgotMessage");
const backToLoginLink = document.getElementById("backToLoginLink");
const logoutButton = document.getElementById("logoutBtn");
const lessonSearchInput = document.getElementById("lessonSearchInput");
const studentName = document.getElementById("student-name");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const lessonFilters = document.getElementById("lessonFilters");
const placeholderContent = document.getElementById("placeholderContent");
const lessonsSection = document.getElementById("lessonsSection");
const previewModal = document.getElementById("previewModal");
const previewModalTitle = document.getElementById("previewModalTitle");
const previewModalBody = document.getElementById("previewModalBody");
const previewOpenButton = document.getElementById("previewOpenButton");
const previewDownloadButton = document.getElementById("previewDownloadButton");
const portalToast = document.getElementById("portalToast");
const closePreviewModal = document.getElementById("closePreviewModal");
const closePreviewButton = document.getElementById("closePreviewButton");
const portalTabs = Array.from(document.querySelectorAll(".portal-tab"));

const STORAGE_THEME_KEY = "jsPortalTheme";
const STORAGE_DOWNLOADED_KEY = "jsPortalDownloadedFiles";
let authMode = "login";
let allLessons = [];
let activeCategory = "All";
let activeTab = "lessons";
let downloadedFiles = new Set(JSON.parse(localStorage.getItem(STORAGE_DOWNLOADED_KEY) || "[]"));
let pendingApprovalMessage = "";
let portalToastTimeout = null;

const fallbackLessons = [
  {
    title: "Variables and data types",
    lesson_number: 1,
    description: "An introduction to variables, strings, numbers, and booleans in JavaScript.",
    file_url: [
      {
        name: "lesson-01.pdf",
        url: "https://example.com/lesson-01.pdf"
      }
    ],
    created_at: "2026-07-10T08:00:00.000Z"
  }
];

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFileIcon(fileName) {
  const extension = String(fileName).split('.').pop().toLowerCase();
  if (["png", "jpg", "jpeg", "svg", "gif", "bmp", "webp"].includes(extension)) return "🖼️";
  if (["html", "css", "js", "json", "jsx", "ts", "tsx", "md", "py", "java", "c", "cpp", "cs", "rb", "php"].includes(extension)) return "🌐";
  if (["zip", "rar", "tar", "gz", "7z", "bz2"].includes(extension)) return "📦";
  if (extension === "pdf") return "📕";
  return "📄";
}

function normalizeLessonFiles(fileData) {
  if (!fileData) return [];

  if (Array.isArray(fileData)) {
    return fileData
      .filter((item) => item && (item.url || item.name))
      .map((item) => {
        const url = item.url || String(item.name || "").trim();
        const name = item.name || (url ? url.split("/").pop() : "download");
        return { url, name };
      })
      .filter((item) => item.url);
  }

  if (typeof fileData === "object" && fileData.url) {
    return [{
      url: fileData.url,
      name: fileData.name || fileData.url.split("/").pop() || "download"
    }];
  }

  if (typeof fileData === "string") {
    const url = fileData.trim() || "#";
    return [{
      url,
      name: url === "#" ? "File unavailable" : url.split("/").pop() || "lesson.pdf"
    }];
  }

  return [];
}

function isFullUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

async function resolveLessonFileUrl(urlOrPath) {
  if (!supabaseClient) {
    throw new Error("Supabase client unavailable.");
  }

  const value = String(urlOrPath || "").trim();
  if (!value) {
    throw new Error("No file URL provided.");
  }

  if (isFullUrl(value)) {
    return value;
  }

  const storagePath = value.replace(/^\/?(?:public\/)?lessons\//, "");
  const { data, error } = await supabaseClient.storage.from("lessons").getPublicUrl(storagePath);
  if (error || !data?.publicUrl) {
    console.error("Unable to resolve public URL from stored path:", storagePath, error);
    throw error || new Error("Unable to resolve public file URL.");
  }

  return data.publicUrl;
}

async function downloadLesson(fileUrl, fileName) {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "lesson-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Lesson download failed:", error);
    showAuthMessage("Unable to download the lesson file. Please try again.", true);
  }
}

function createFileList(lesson) {
  const files = normalizeLessonFiles(lesson.file_url);

  if (!files.length) {
    return `
      <div class="lesson-card__file-list">
        <div class="lesson-card__file-item lesson-card__file-item--empty">
          <span class="lesson-card__file-meta">
            <span class="lesson-card__file-icon">📄</span>
            <span class="lesson-card__file-name">No downloadable files</span>
          </span>
        </div>
      </div>
    `;
  }

  return `
    <div class="lesson-card__file-list">
      ${files
        .map(
          ({ url, name }) => {
            const safeUrl = escapeHtml(url);
            const safeName = escapeHtml(name);
            return `
              <div class="lesson-card__file-item">
                <div class="lesson-card__file-meta">
                  <span class="lesson-card__file-icon">${getFileIcon(name)}</span>
                  <span class="lesson-card__file-name" title="${safeName}">${safeName}</span>
                </div>
                <div class="lesson-card__file-actions">
                  <button
                    class="lesson-card__preview-btn"
                    type="button"
                    data-preview-url="${safeUrl}"
                    data-preview-name="${safeName}"
                  >
                    Preview
                  </button>
                  <button
                    class="lesson-card__download-btn"
                    type="button"
                    data-download-url="${safeUrl}"
                    data-download-name="${safeName}"
                  >
                    Download
                  </button>
                </div>
              </div>
            `;
          }
        )
        .join("")}
    </div>
  `;
}

function createLessonCard(lesson) {
  const title = lesson.title || "Untitled lesson";
  const description = lesson.description || "No description available.";
  const lessonNumber = lesson.lesson_number
    ? `Lesson ${String(lesson.lesson_number).padStart(2, "0")}`
    : "Lesson 01";
  const category = lesson.category || "General";
  const createdAt = formatDisplayDate(lesson.created_at);
  const fileListHtml = createFileList(lesson);

  return `
    <article class="lesson-card">
      <div class="lesson-card__header">
        <span class="lesson-card__badge">${lessonNumber}</span>
        <h3 class="lesson-card__title">${title}</h3>
      </div>
      <div class="lesson-card__meta">
        <div class="lesson-card__meta-row">
          <div class="lesson-card__date">Uploaded: ${createdAt}</div>
          <span class="lesson-card__category">${category}</span>
        </div>
        <p class="lesson-card__description">${description}</p>
      </div>
      <div class="lesson-card__footer">
        ${fileListHtml}
      </div>
    </article>
  `;
}

function renderLessons(lessons) {
  const visibleLessons = lessons || [];

  if (!visibleLessons.length) {
    lessonsContainer.innerHTML = '<div class="empty-state">No lessons found.</div>';
    return;
  }

  lessonsContainer.innerHTML = visibleLessons.map(createLessonCard).join("");
}

function filterLessons(searchTerm) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    renderLessons(allLessons);
    return;
  }

  const filteredLessons = (allLessons || []).filter((lesson) => {
    const title = (lesson.title || "").toLowerCase();
    return title.includes(normalizedSearch);
  });

  renderLessons(filteredLessons);
}

function clearAuthMessage() {
  if (authMessage) {
    authMessage.textContent = "";
    authMessage.className = "auth-form__message";
    authMessage.hidden = false;
  }
}

function clearForgotMessage() {
  if (forgotMessage) {
    forgotMessage.textContent = "";
    forgotMessage.className = "auth-form__message";
    forgotMessage.hidden = false;
  }
}

function showForgotMessage(message, isError = false) {
  if (!forgotMessage) return;

  forgotMessage.textContent = message;
  forgotMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function showLoginForm() {
  if (authForm) authForm.hidden = false;
  if (forgotPasswordForm) forgotPasswordForm.hidden = true;
  if (authMessage) authMessage.hidden = false;
  if (forgotMessage) forgotMessage.hidden = true;
  clearAuthMessage();
  clearForgotMessage();
}

function showForgotPasswordScreen() {
  if (authForm) authForm.hidden = true;
  if (forgotPasswordForm) forgotPasswordForm.hidden = false;
  if (authMessage) authMessage.hidden = true;
  if (approvalState) approvalState.hidden = true;
  clearForgotMessage();
  if (forgotPasswordForm) forgotPasswordForm.reset();
}

function toggleApprovalState(show) {
  if (approvalState) {
    approvalState.hidden = !show;
  }

  if (authForm) {
    authForm.hidden = show;
  }

  if (authMessage) {
    authMessage.hidden = show;
  }
}

function showApprovalState(message, title = "Registration received") {
  if (approvalTitle) {
    approvalTitle.textContent = title;
  }

  if (approvalMessage) {
    approvalMessage.textContent = message;
  }

  toggleApprovalState(true);
}

function hideApprovalState() {
  toggleApprovalState(false);
}

function showAuthMessage(message, isError = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function showPortalToast(message) {
  if (!portalToast) return;

  portalToast.textContent = message;
  portalToast.hidden = false;
  portalToast.classList.add("toast-visible");
  portalToast.classList.remove("toast-hidden");

  if (portalToastTimeout) {
    window.clearTimeout(portalToastTimeout);
  }

  portalToastTimeout = window.setTimeout(() => {
    if (!portalToast) return;
    portalToast.classList.remove("toast-visible");
    portalToast.classList.add("toast-hidden");
    window.setTimeout(() => {
      if (portalToast) portalToast.hidden = true;
    }, 250);
  }, 3000);
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
    authToggleLink.hidden = false;
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.hidden = mode !== "login";
  }

  clearAuthMessage();
  clearForgotMessage();
  if (authForm) {
    authForm.reset();
    authForm.hidden = false;
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.hidden = true;
  }
}

function setStudentName(fullName) {
  if (!studentName) return;
  studentName.textContent = fullName || "...";
}

function showAuthScreen() {
  if (pageShell) pageShell.hidden = true;
  if (authContainer) authContainer.hidden = false;
  if (logoutButton) logoutButton.hidden = true;
  lessonsContainer.innerHTML = "";
  hideApprovalState();
  showLoginForm();
  setStudentName("...");
}

function showPortalScreen() {
  if (pageShell) pageShell.hidden = false;
  if (authContainer) authContainer.hidden = true;
  if (logoutButton) logoutButton.hidden = false;
  lessonsContainer.innerHTML = '<div class="empty-state">Loading lessons...</div>';
  hideApprovalState();
}

async function fetchLessons() {
  if (!supabaseClient) {
    allLessons = fallbackLessons;
    updateFiltersAndRender();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("lessons")
      .select("title, lesson_number, description, file_url, created_at, category")
      .order("created_at", { ascending: false });

    if (error) throw error;
    allLessons = data || [];
    updateFiltersAndRender();
  } catch (error) {
    console.error("Failed to fetch lessons:", error);
    allLessons = fallbackLessons;
    updateFiltersAndRender();
  }
}

function getCategories(lessons) {
  const values = new Set(["All"]);
  (lessons || []).forEach((lesson) => {
    if (lesson.category) {
      values.add(lesson.category);
    }
  });
  return Array.from(values);
}

function setActiveCategory(category) {
  activeCategory = category;
  document.querySelectorAll(".lesson-filter").forEach((button) => {
    button.classList.toggle(
      "lesson-filter--active",
      button.dataset.category?.toLowerCase() === category.toLowerCase()
    );
  });
  updateFiltersAndRender();
}

function updateFiltersAndRender() {
  const filteredLessons = allLessons.filter((lesson) => {
    const categoryValue = String(lesson.category || "").toLowerCase();
    const selectedCategory = activeCategory.toLowerCase();
    const matchesCategory = selectedCategory === "all" || categoryValue === selectedCategory;
    const searchTerm = lessonSearchInput?.value.trim().toLowerCase() || "";
    const matchesSearch = !searchTerm || (lesson.title || "").toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  renderLessons(filteredLessons);
  renderCategoryFilters(getCategories(allLessons));
}

function renderCategoryFilters(categories) {
  if (!lessonFilters) return;
  const selectedCategory = activeCategory.toLowerCase();
  lessonFilters.innerHTML = categories
    .map((category) => {
      const isActive = category.toLowerCase() === selectedCategory;
      return `
      <button class="lesson-filter${isActive ? ' lesson-filter--active' : ''}" type="button" data-category="${category}">
        ${category}
      </button>
    `;
    })
    .join("");
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

    pendingApprovalMessage = "Your registration was successful. Please wait for teacher approval and keep an eye on your inbox for the confirmation email.";
    showApprovalState(pendingApprovalMessage, "Registration received");
    authForm.reset();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error), true);
  } finally {
    if (authSubmitBtn) {
      authSubmitBtn.disabled = false;
    }
  }
}

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  clearForgotMessage();

  const email = forgotPasswordEmailInput?.value.trim() || "";

  if (!email) {
    showForgotMessage("Please enter your email address.", true);
    return;
  }

  if (!supabaseClient) {
    showForgotMessage("The authentication service is unavailable.", true);
    return;
  }

  if (forgotPasswordSubmitBtn) {
    forgotPasswordSubmitBtn.disabled = true;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) throw error;

    showForgotMessage("If an account exists for this email, a reset link has been sent.");
  } catch (error) {
    showForgotMessage(getAuthErrorMessage(error), true);
  } finally {
    if (forgotPasswordSubmitBtn) {
      forgotPasswordSubmitBtn.disabled = false;
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
      .select("full_name, is_approved")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showApprovalState("Your account is still waiting for teacher approval. Please keep an eye on your email for the confirmation notice.", "Still pending approval");
      return;
    }

    setStudentName(profileData?.full_name || "...");
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
      .select("full_name, is_approved")
      .eq("id", user.id)
      .single();

    if (error || !profileData?.is_approved) {
      await supabaseClient.auth.signOut();
      showAuthScreen();
      showApprovalState("Your account is still waiting for teacher approval. Please keep an eye on your email for the confirmation notice.", "Still pending approval");
      return;
    }

    setStudentName(profileData?.full_name || "...");
    showPortalScreen();
    await fetchLessons();
  } catch (error) {
    console.error("Auth state check failed:", error);
    showAuthScreen();
  }
}

async function handleLessonDownloadClick(event) {
  const downloadButton = event.target.closest(".lesson-card__download-btn");
  if (!downloadButton || !lessonsContainer?.contains(downloadButton)) return;

  event.preventDefault();

  const rawUrl = downloadButton.dataset.downloadUrl;
  const fileName = downloadButton.dataset.downloadName;
  if (!rawUrl) {
    showAuthMessage("Download URL is not available.", true);
    return;
  }

  try {
    const fileUrl = await resolveLessonFileUrl(rawUrl);
    console.log("Download attempt for resolved file URL:", fileUrl);
    downloadedFiles.add(fileName);
    localStorage.setItem(STORAGE_DOWNLOADED_KEY, JSON.stringify(Array.from(downloadedFiles)));
    showPortalToast("Downloaded");
    await downloadLesson(fileUrl, fileName);
  } catch (error) {
    console.error("Download URL resolution failed:", error);
    showAuthMessage("Unable to resolve the download link. Please contact your administrator.", true);
  }
}

async function openPreviewModal(fileUrl, fileName) {
  if (!previewModal || !previewModalTitle || !previewModalBody || !previewDownloadButton) return;

  previewModalTitle.textContent = `Preview: ${fileName}`;
  previewModalBody.innerHTML = `<div class="preview-panel">Loading preview...</div>`;
  previewModal.hidden = false;
  document.body.classList.add("modal-open");

  if (!fileUrl) {
    previewModalBody.innerHTML = `<div class="preview-panel">Preview URL is not available.</div>`;
    return;
  }

  try {
    const resolvedUrl = await resolveLessonFileUrl(fileUrl);
    console.log("Preview attempt for resolved file URL:", resolvedUrl);
    previewDownloadButton.href = resolvedUrl;
    previewDownloadButton.download = fileName;
    if (previewOpenButton) {
      previewOpenButton.href = resolvedUrl;
    }
    const extension = fileName.split('.').pop().toLowerCase();

    if (["pdf"].includes(extension)) {
      const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
      previewModalBody.innerHTML = `<iframe class="preview-frame" src="${previewUrl}" title="PDF preview"></iframe>`;
      return;
    }

    if (["png", "jpg", "jpeg", "svg", "gif", "bmp", "webp"].includes(extension)) {
      previewModalBody.innerHTML = `<div class="preview-panel"><img class="preview-image" src="${resolvedUrl}" alt="Preview ${fileName}" /></div>`;
      return;
    }

    if (["html", "css", "js", "json", "md", "txt"].includes(extension)) {
      try {
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error("Preview could not be loaded.");
        const text = await response.text();
        previewModalBody.innerHTML = `<pre class="preview-text">${escapeHtml(text)}</pre>`;
        return;
      } catch (error) {
        console.error("Preview failed:", error);
      }
    }

    previewModalBody.innerHTML = `<div class="preview-panel">Preview not available for this file type. Use download instead.</div>`;
  } catch (error) {
    console.error("Preview modal error:", error);
    previewModalBody.innerHTML = `<div class="preview-panel">Unable to load preview.</div>`;
  }
}

function closeModal() {
  if (!previewModal) return;
  previewModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function handleLessonCardAction(event) {
  const previewButton = event.target.closest(".lesson-card__preview-btn");
  if (previewButton) {
    const previewUrl = previewButton.dataset.previewUrl;
    const previewName = previewButton.dataset.previewName;
    if (previewUrl && previewName) {
      openPreviewModal(previewUrl, previewName);
    }
    return;
  }

  handleLessonDownloadClick(event);
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("theme-light");
    document.documentElement.classList.remove("theme-dark");
    themeToggleBtn.textContent = "🌙";
  } else {
    document.documentElement.classList.add("theme-dark");
    document.documentElement.classList.remove("theme-light");
    themeToggleBtn.textContent = "☀️";
  }
  localStorage.setItem(STORAGE_THEME_KEY, theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains("theme-light") ? "light" : "dark";
  setTheme(currentTheme === "light" ? "dark" : "light");
}

function handleTabClick(event) {
  const button = event.target.closest(".portal-tab");
  if (!button) return;

  activeTab = button.dataset.tab || "lessons";
  portalTabs.forEach((tab) => tab.classList.toggle("portal-tab--active", tab === button));

  const isLessonsTab = activeTab === "lessons";
  if (lessonsSection) lessonsSection.hidden = !isLessonsTab;

  if (placeholderContent) {
    placeholderContent.hidden = isLessonsTab;

    if (!isLessonsTab) {
      const titleElement = placeholderContent.querySelector("#placeholderTitle");
      const descElement = placeholderContent.querySelector("#placeholderDescription");
      let title = "Coming soon";
      let description = "We are building this section for future student assignments, quizzes, and announcements.";

      if (activeTab === "assignments") {
        title = "Assignments coming soon";
        description = "This section will let you view and submit assignments once it is ready.";
      } else if (activeTab === "quizzes") {
        title = "Quizzes coming soon";
        description = "Quizzes will appear here when the section is launched.";
      } else if (activeTab === "announcements") {
        title = "Announcements coming soon";
        description = "Important announcements will be available here soon.";
      }

      if (titleElement) titleElement.textContent = title;
      if (descElement) descElement.textContent = description;
    }
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

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", showForgotPasswordScreen);
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", () => {
      setAuthMode("login");
      showLoginForm();
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", handleForgotPasswordSubmit);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (approvalBackBtn) {
    approvalBackBtn.addEventListener("click", () => {
      setAuthMode("login");
      showAuthScreen();
    });
  }

  if (lessonSearchInput) {
    lessonSearchInput.addEventListener("input", () => updateFiltersAndRender());
  }

  if (lessonFilters) {
    lessonFilters.addEventListener("click", (event) => {
      const button = event.target.closest(".lesson-filter");
      if (!button) return;
      const category = button.dataset.category || "All";
      setActiveCategory(category);
    });
  }

  if (lessonsContainer) {
    lessonsContainer.addEventListener("click", handleLessonCardAction);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  portalTabs.forEach((tab) => {
    tab.addEventListener("click", handleTabClick);
  });

  if (closePreviewModal) {
    closePreviewModal.addEventListener("click", closeModal);
  }

  if (closePreviewButton) {
    closePreviewButton.addEventListener("click", closeModal);
  }

  if (previewModal) {
    previewModal.addEventListener("click", (event) => {
      if (event.target === previewModal) closeModal();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();
  setAuthMode("login");
  setStudentName("...");
  showAuthScreen();

  if (!supabaseClient) {
    showAuthMessage("The authentication service is unavailable.", true);
    return;
  }

  const savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange(_event, session);
  });

  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    handleAuthStateChange("INITIAL_SESSION", session);
  });
});
