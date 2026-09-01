const permissionButton =
  document.getElementById("permissionButton");

const successBox =
  document.getElementById("successBox");

const errorBox =
  document.getElementById("errorBox");

permissionButton.addEventListener(
  "click",
  async () => {
    try {
      errorBox.hidden = true;

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      stream
        .getTracks()
        .forEach((track) => track.stop());

      successBox.hidden = false;

      permissionButton.disabled = true;
      permissionButton.textContent =
        "Microphone Enabled";
    } catch (error) {
      console.error(
        "MICROPHONE PERMISSION ERROR:",
        error
      );

      errorBox.textContent =
        "Microphone permission was not granted. Check Chrome microphone settings and try again.";

      errorBox.hidden = false;
    }
  }
);