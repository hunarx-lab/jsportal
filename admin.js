const SUPABASE_URL = 'https://pxdhqwiztigwqzrzummo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pVDRTFYOulR0QuQ1lcl9MA_vEYBr00-';
const ADMIN_EMAIL = 'admin@gmail.com';

const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const authSection = document.getElementById('authSection');
const adminContent = document.getElementById('adminContent');
const adminAuthForm = document.getElementById('adminAuthForm');
const adminAuthMessage = document.getElementById('adminAuthMessage');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const uploadForm = document.getElementById('uploadForm');
const editForm = document.getElementById('editForm');
const lessonsTableBody = document.getElementById('lessonsTableBody');
const lessonTitleInput = document.getElementById('lessonTitleInput');
const sessionNumberInput = document.getElementById('sessionNumberInput');
const lessonDescriptionInput = document.getElementById('lessonDescriptionInput');
const lessonCategoryInput = document.getElementById('lessonCategoryInput');
const lessonDateInput = document.getElementById('lessonDateInput');
const lessonFileInput = document.getElementById('lessonFileInput');
const editTitleInput = document.getElementById('editTitleInput');
const editSessionInput = document.getElementById('editSessionInput');
const editDescriptionInput = document.getElementById('editDescriptionInput');
const editCategoryInput = document.getElementById('editCategoryInput');
const editLessonFileInput = document.getElementById('editLessonFileInput');
const uploadMessage = document.getElementById('uploadMessage');
const editMessage = document.getElementById('editMessage');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const logoutButton = document.getElementById('logoutBtn');

let lessons = [];
let editingLessonId = null;
let currentUser = null;

function showMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.className = `auth-form__message${isError ? ' auth-form__message--error' : ' auth-form__message--success'}`;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = '';
  element.className = 'auth-form__message';
}

function isAdminUser(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
}

async function handleAuthStateChange(event, session) {
  if (event === 'SIGNED_OUT' || !session?.user) {
    currentUser = null;
    showLoginScreen();
    return;
  }

  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && isAdminUser(session.user)) {
    currentUser = session.user;
    showAdminScreen();
    return;
  }

  if (session?.user && !isAdminUser(session.user)) {
    await supabaseClient.auth.signOut();
    currentUser = null;
    showLoginScreen();
  }
}

async function ensureAdminSessionValid() {
  if (!supabaseClient) return false;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session?.user || !isAdminUser(session.user)) {
    currentUser = null;
    showMessage(adminAuthMessage, 'Your session has expired, please log in again', true);
    await handleLogout();
    return false;
  }
  currentUser = session.user;
  return true;
}

function showAdminScreen() {
  if (authSection) authSection.hidden = true;
  if (adminContent) adminContent.hidden = false;
}

function showLoginScreen() {
  if (authSection) authSection.hidden = false;
  if (adminContent) adminContent.hidden = true;
  if (editForm) editForm.hidden = true;
  editingLessonId = null;
}

function renderLessons() {
  if (!lessonsTableBody) return;
  if (!lessons.length) {
    lessonsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No lessons yet.</td></tr>';
    return;
  }

  lessonsTableBody.innerHTML = lessons.map((lesson) => {
    const title = lesson.title || 'Untitled lesson';
    const session = lesson.lesson_number || '-';
    const category = lesson.category || 'General';
    const date = lesson.created_at ? new Date(lesson.created_at).toLocaleDateString('en-US') : '-';
    const fileList = Array.isArray(lesson.file_url) ? lesson.file_url : lesson.file_url ? [{ url: lesson.file_url }] : [];
    const fileUrl = fileList[0]?.url || '#';
    const fileLabel = fileList.length > 1 ? `Open ${fileList.length} files` : 'Open file';
    return `
      <tr>
        <td>${title}</td>
        <td>${session}</td>
        <td>${category}</td>
        <td>${date}</td>
        <td><a href="${fileUrl}" target="_blank" rel="noopener noreferrer">${fileLabel}</a></td>
        <td>
          <div class="admin-actions">
            <button class="admin-action-btn" type="button" data-action="edit" data-id="${lesson.id}">Edit</button>
            <button class="admin-action-btn" type="button" data-action="delete" data-id="${lesson.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadLessons() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('lessons')
      .select('id, title, lesson_number, description, file_url, created_at, storage_path')
      .order('created_at', { ascending: false });

    if (error) throw error;
    lessons = data || [];
    renderLessons();
  } catch (error) {
    try {
      const { data, error: fallbackError } = await supabaseClient
        .from('lessons')
        .select('id, title, lesson_number, description, file_url, created_at')
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      lessons = data || [];
      renderLessons();
    } catch (fallbackError) {
      console.error(fallbackError);
      showMessage(adminAuthMessage, 'Unable to load lessons right now.', true);
    }
  }
}

async function signInAdmin(event) {
  event.preventDefault();
  clearMessage(adminAuthMessage);

  const email = adminEmailInput?.value.trim() || '';
  const password = adminPasswordInput?.value || '';

  if (!supabaseClient) {
    showMessage(adminAuthMessage, 'The authentication service is unavailable.', true);
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (!data?.user || !isAdminUser(data.user)) {
      await supabaseClient.auth.signOut();
      showMessage(adminAuthMessage, 'Only the configured administrator account can access this panel.', true);
      return;
    }

    currentUser = data.user;
    showAdminScreen();
    await loadLessons();
  } catch (error) {
    showMessage(adminAuthMessage, error.message || 'Sign-in failed.', true);
  }
}

async function handleLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  showLoginScreen();
}

async function uploadLesson(event) {
  event.preventDefault();
  if (!supabaseClient || !currentUser) return;
  if (!(await ensureAdminSessionValid())) return;

  const title = lessonTitleInput?.value.trim();
  const sessionNumber = sessionNumberInput?.value;
  const description = lessonDescriptionInput?.value.trim();
  const category = lessonCategoryInput?.value;
  const lessonDate = lessonDateInput?.value;
  const selectedFiles = Array.from(lessonFileInput?.files || []);

  if (!title || !sessionNumber || !category || !lessonDate || selectedFiles.length === 0) {
    showMessage(uploadMessage, 'Please fill in every field and choose at least one file.', true);
    return;
  }

  const uploadedPaths = [];
  const fileUrlEntries = [];
  const storagePaths = [];

  try {
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const safeFileName = (file.name || 'lesson-file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `lessons/${Date.now()}-${index}-${safeFileName}`;
      const contentDispositionFileName = (file.name || safeFileName).replace(/"/g, '');

      const { error: uploadError } = await supabaseClient.storage.from('lessons').upload(storagePath, file, {
        contentDisposition: `attachment; filename="${contentDispositionFileName}"; filename*=UTF-8''${encodeURIComponent(contentDispositionFileName)}`,
        cacheControl: 'max-age=0, s-maxage=0, no-cache, no-store, must-revalidate',
        contentType: 'application/octet-stream',
        upsert: true
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData, error: publicUrlError } = supabaseClient.storage.from('lessons').getPublicUrl(storagePath);
      if (publicUrlError) throw publicUrlError;

      const publicUrl = publicUrlData?.publicUrl;
      if (!publicUrl) throw new Error(`Unable to generate public URL for ${file.name}`);

      uploadedPaths.push(storagePath);
      fileUrlEntries.push({ name: file.name, url: publicUrl });
      storagePaths.push(storagePath);
    }

    const { error: lessonsError } = await supabaseClient.from('lessons').insert([{
      title,
      lesson_number: Number(sessionNumber),
      description,
      category,
      file_url: fileUrlEntries,
      storage_path: storagePaths,
      created_at: lessonDate
    }]);

    if (lessonsError) throw lessonsError;

    uploadForm.reset();
    showMessage(uploadMessage, 'Lesson uploaded successfully.', false);
    await loadLessons();
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await supabaseClient.storage.from('lessons').remove(uploadedPaths);
      } catch (cleanupError) {
        console.warn('Cleanup after failed upload failed:', cleanupError);
      }
    }
    showMessage(adminAuthMessage, error.message || 'Upload failed.', true);
  }
}

function startEditLesson(id) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;
  editingLessonId = id;
  editTitleInput.value = lesson.title || '';
  editSessionInput.value = lesson.lesson_number || '';
  editDescriptionInput.value = lesson.description || '';
  editCategoryInput.value = lesson.category || 'General';
  editForm.hidden = false;
}

function cancelEdit() {
  editingLessonId = null;
  editForm.hidden = true;
  editForm.reset();
}

async function uploadFilesToStorage(files) {
  const uploadedPaths = [];
  const fileUrlEntries = [];
  const storagePaths = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeFileName = (file.name || 'lesson-file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `lessons/${Date.now()}-${index}-${safeFileName}`;
    const contentDispositionFileName = (file.name || safeFileName).replace(/"/g, '');

    const { error: uploadError } = await supabaseClient.storage.from('lessons').upload(storagePath, file, {
      contentDisposition: `attachment; filename="${contentDispositionFileName}"; filename*=UTF-8''${encodeURIComponent(contentDispositionFileName)}`,
      cacheControl: 'max-age=0, s-maxage=0, no-cache, no-store, must-revalidate',
      contentType: 'application/octet-stream',
      upsert: true
    });
    if (uploadError) throw uploadError;

    const { data: publicUrlData, error: publicUrlError } = supabaseClient.storage.from('lessons').getPublicUrl(storagePath);
    if (publicUrlError) throw publicUrlError;

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error(`Unable to generate public URL for ${file.name}`);

    uploadedPaths.push(storagePath);
    fileUrlEntries.push({ name: file.name, url: publicUrl });
    storagePaths.push(storagePath);
  }

  return { uploadedPaths, fileUrlEntries, storagePaths };
}

async function saveEditLesson(event) {
  event.preventDefault();
  if (!supabaseClient || !editingLessonId) return;
  if (!(await ensureAdminSessionValid())) return;

  const replacementFiles = Array.from(editLessonFileInput?.files || []);
  const updateData = {
    title: editTitleInput.value.trim(),
    lesson_number: Number(editSessionInput.value),
    description: editDescriptionInput.value.trim(),
    category: editCategoryInput.value || 'General'
  };

  let uploadedPaths = [];
  let newStoragePaths = [];
  let newFileUrlEntries = [];
  let oldStoragePaths = [];

  try {
    if (replacementFiles.length) {
      const lesson = lessons.find((item) => item.id === editingLessonId);
      oldStoragePaths = Array.isArray(lesson.storage_path) ? lesson.storage_path : lesson.storage_path ? [lesson.storage_path] : [];

      const uploadResult = await uploadFilesToStorage(replacementFiles);
      uploadedPaths = uploadResult.uploadedPaths;
      newStoragePaths = uploadResult.storagePaths;
      newFileUrlEntries = uploadResult.fileUrlEntries;

      updateData.file_url = newFileUrlEntries;
      updateData.storage_path = newStoragePaths;
    }

    const { error } = await supabaseClient
      .from('lessons')
      .update(updateData)
      .eq('id', editingLessonId);

    if (error) throw error;

    if (replacementFiles.length && oldStoragePaths.length) {
      await supabaseClient.storage.from('lessons').remove(oldStoragePaths);
    }

    showMessage(editMessage, 'Lesson updated successfully.', false);
    cancelEdit();
    await loadLessons();
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await supabaseClient.storage.from('lessons').remove(uploadedPaths);
      } catch (cleanupError) {
        console.warn('Cleanup after failed edit upload failed:', cleanupError);
      }
    }
    showMessage(adminAuthMessage, error.message || 'Update failed.', true);
  }
}

async function deleteLesson(id) {
  if (!supabaseClient) return;
  if (!(await ensureAdminSessionValid())) return;
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return;

  const confirmed = window.confirm(`Delete ${lesson.title || 'this lesson'}?`);
  if (!confirmed) return;

  try {
    if (lesson.storage_path) {
      const storagePaths = Array.isArray(lesson.storage_path) ? lesson.storage_path : [lesson.storage_path];
      await supabaseClient.storage.from('lessons').remove(storagePaths);
    }
    const { error } = await supabaseClient.from('lessons').delete().eq('id', id);
    if (error) throw error;
    showMessage(adminAuthMessage, 'Lesson deleted successfully.', false);
    await loadLessons();
  } catch (error) {
    showMessage(adminAuthMessage, error.message || 'Delete failed.', true);
  }
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'edit') startEditLesson(Number(id));
  if (action === 'delete') deleteLesson(Number(id));
}

async function initializeAdmin() {
  if (!supabaseClient) {
    showMessage(adminAuthMessage, 'Supabase is not available.', true);
    return;
  }

  adminAuthForm?.addEventListener('submit', signInAdmin);
  uploadForm?.addEventListener('submit', uploadLesson);
  editForm?.addEventListener('submit', saveEditLesson);
  cancelEditBtn?.addEventListener('click', cancelEdit);
  lessonsTableBody?.addEventListener('click', handleTableClick);
  logoutButton?.addEventListener('click', handleLogout);

  supabaseClient.auth.onAuthStateChange((event, session) => {
    handleAuthStateChange(event, session).catch((error) => console.error('Auth state listener failed:', error));
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    if (!isAdminUser(session.user)) {
      await supabaseClient.auth.signOut();
      showLoginScreen();
      return;
    }
    currentUser = session.user;
    showAdminScreen();
    await loadLessons();
  } else {
    showLoginScreen();
  }
}

document.addEventListener('DOMContentLoaded', initializeAdmin);
