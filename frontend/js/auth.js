document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("authForm");
  if (!form) return;
  const submitButton = document.getElementById("submitButton");
  const signup = Boolean(document.getElementById("confirmPassword"));
  const feedback = document.createElement("p");
  feedback.setAttribute("aria-live", "polite");
  feedback.style.cssText = "min-height:18px;margin:12px 0 0;color:#dc2626;font-size:12px;text-align:center";
  submitButton.insertAdjacentElement("afterend", feedback);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    feedback.textContent = "";
    document.querySelectorAll(".field-error").forEach(element => element.textContent = "");
    let valid = true;
    document.querySelectorAll("input").forEach(input => {
      input.setAttribute("aria-invalid", "false");
      if (!input.value.trim()) {
        valid = false;
        input.setAttribute("aria-invalid", "true");
        const error = input.closest(".form-group")?.querySelector(".field-error");
        if (error) error.textContent = "This field is required.";
      }
    });

    const email = document.getElementById("email");
    if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      valid = false;
      email.setAttribute("aria-invalid", "true");
      email.closest(".form-group").querySelector(".field-error").textContent = "Enter a valid email address.";
    }
    const password = document.getElementById("password");
    if (password.value.length < 8) {
      valid = false;
      password.setAttribute("aria-invalid", "true");
      password.closest(".form-group").querySelector(".field-error").textContent = "Password must be at least 8 characters.";
    }
    const confirm = document.getElementById("confirmPassword");
    if (confirm && confirm.value !== password.value) {
      valid = false;
      confirm.setAttribute("aria-invalid", "true");
      confirm.closest(".form-group").querySelector(".field-error").textContent = "Passwords do not match.";
    }
    if (!valid) return;

    const original = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span>';
    try {
      if (signup) {
        const result = await SafeCityAPI.post("/auth/signup", {
          name: document.getElementById("fullName").value.trim(),
          email: email.value.trim(),
          password: password.value
        });
        feedback.style.color = "#15803d";
        feedback.textContent = result.message || "Account created. You can now sign in.";
        form.reset();
        setTimeout(() => { window.location.href = "login.html"; }, 900);
      } else {
        const result = await SafeCityAPI.post("/auth/login", { email: email.value.trim(), password: password.value });
        SafeCityAPI.saveSession(result.data.token, result.data.user);
        window.location.href = "dashboard.html";
      }
    } catch (error) {
      feedback.style.color = "#dc2626";
      feedback.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = original;
    }
  });

  if (window.lucide) lucide.createIcons();
});
