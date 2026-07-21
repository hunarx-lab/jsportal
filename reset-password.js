const SUPABASE_URL = "https://pxdhqwiztigwqzrzummo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pVDRTFYOulR0QuQ1lcl9MA_vEYBr00-";

const supabaseClient =
  window.supabase && typeof window.supabase.createClient === "function"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const recoveryForm = document.getElementById("recoveryForm");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");
const recoveryMessage = document.getElementById("recoveryMessage");
const recoverySubmitBtn = document.getElementById("recoverySubmitBtn");

function showRecoveryMessage(message, isError = false) {
  if (!recoveryMessage) return;
  recoveryMessage.textContent = message;
  recoveryMessage.className = `auth-form__message${isError ? " auth-form__message--error" : " auth-form__message--success"}`;
}

function getErrorMessage(error) {
  const message = error?.message || "";

  if (/expired|invalid|password recovery/i.test(message)) {
    return "This reset link is invalid or has expired. Please request a new one.";
  }

  if (/password/i.test(message)) {
    return "Your password must be at least 8 characters long.";
  }

  if (/network|fetch|failed/i.test(message)) {
    return "The connection to the server failed. Please try again.";
  }

  return "An error occurred while updating your password.";
}

function getRecoverySession() {
  if (!supabaseClient) return null;
  return supabaseClient.auth.getSessionFromUrl();
}

async function handleRecoverySubmit(event) {
  event.preventDefault();
  showRecoveryMessage("");

  const newPassword = newPasswordInput?.value || "";
  const confirmPassword = confirmNewPasswordInput?.value || "";

  if (!newPassword || !confirmPassword) {
    showRecoveryMessage("Please fill in both password fields.", true);
    return;
  }

  if (newPassword.length < 8) {
    showRecoveryMessage("Password must be at least 8 characters long.", true);
    return;
  }

  if (newPassword !== confirmPassword) {
    showRecoveryMessage("The passwords do not match.", true);
    return;
  }

  if (!supabaseClient) {
    showRecoveryMessage("The authentication service is unavailable.", true);
    return;
  }

  if (recoverySubmitBtn) {
    recoverySubmitBtn.disabled = true;
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showRecoveryMessage("Your password has been updated. You can now sign in with your new password.");
  } catch (error) {
    showRecoveryMessage(getErrorMessage(error), true);
  } finally {
    if (recoverySubmitBtn) {
      recoverySubmitBtn.disabled = false;
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabaseClient) {
    showRecoveryMessage("The authentication service is unavailable.", true);
    return;
  }

  try {
    await getRecoverySession();
  } catch (error) {
    console.error("Failed to parse recovery session:", error);
    showRecoveryMessage("This reset link is invalid or has expired. Please request a new one.", true);
  }

  if (recoveryForm) {
    recoveryForm.addEventListener("submit", handleRecoverySubmit);
  }
});
