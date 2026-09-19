/*
   The Box mini-game.

   Loaded lazily by script.js (loadTheBoxScript) the first time the
   player opens The Box. Everything below runs inside the #theBoxContent
   modal container. The real gameplay will be described later.
*/

function initTheBox() {
  const content = document.getElementById("theBoxContent");
  if (!content) return;

  content.innerHTML = `
    <div class="theBoxWelcome">
      <p>Welcome to The Box.</p>
      <p>Nothing inside yet — the minigame is under construction.</p>
    </div>
  `;
}