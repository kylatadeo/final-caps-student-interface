// Login page
function goToMain() {
  window.location.href = "./general/main-dashboard.html";
}

// fetching nav and sidebar html
function loadComponent(id, file, callback) {
  fetch(file)
    .then(response => response.text())
    .then(data => {
      document.getElementById(id).innerHTML = data;
      if (callback) callback(); // Initialize events AFTER loading
    })
    .catch(error => console.error(`Error loading ${file}:`, error));
}

// for navbar and sidebar debugging
function initializeMenu() {
  console.log("Initializing menu...");

  const toggleButton = document.querySelector("#navbar-container #toggle-button");
  const sidebar = document.querySelector("#sidebar-container #sidebar");

  if (toggleButton && sidebar) {
    console.log("Toggle button and sidebar found.");
    
    toggleButton.addEventListener("click", () => {
      console.log("Toggle button clicked.");
      sidebar.classList.toggle("close");
    });

  } else {
    console.error("Toggle button or sidebar not found.");
  }
}

// Load navbar and sidebar
loadComponent("navbar-container", "../navbar.html", initializeMenu);
loadComponent("sidebar-container", "../sidebar.html", initializeMenu);

// Menu toggle and sidebar
const toggleButton = document.getElementById('toggle-button')
const sidebar = document.getElementById('sidebar')

function toggleSideBar() {
  sidebar.classList.toggle('close'); 
}

function toggleSubMenu(button) {
  button.nextElementSibling.classList.toggle('show');
  button.classList.toggle('rotate');
}

document.addEventListener("DOMContentLoaded", () => {
  const mailButton = document.getElementById("mail");
  if (!mailButton) return;

  mailButton.addEventListener("click", () => {
    const path = window.location.pathname;

    if (path.includes("/student/")) {
      window.location.href = "../student/student-messaging.html";
    } else if (path.includes("/adviser/")) {
      window.location.href = "../adviser/adviser-navmessaging.html";
    } else if (path.includes("/ceat-ocs/")) {
      window.location.href = "../ceat-ocs/ocs-navmessaging.html";
    } else {
      console.warn("Unknown folder — no redirect for mail button.");
    }
  });
});
