// =====================================
// TEST WHAT KEYS YOUR TV IS SENDING
// =====================================

document.addEventListener("keydown", function(e) {

    // Show key info on screen
    alert("Key: " + e.key + " | Code: " + e.keyCode);

    console.log("Key:", e.key, "Code:", e.keyCode);

});