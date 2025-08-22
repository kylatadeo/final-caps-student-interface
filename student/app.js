document.addEventListener("DOMContentLoaded", function() {
  changeTab(0, 'student-info.html');
});

// course-planning.html tab contents
function changeTab(index, page) {
  const tabs = document.querySelectorAll(".tab");
  const content = document.getElementById("tabContent");

  // Update active tab styling
  tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === index);
      tab.classList.toggle("inactive", i !== index);
  });

  // Load HTML content dynamically
  fetch(page)
      .then(response => response.text())
      .then(html => {
          content.innerHTML = html;

          // Reattach event listeners
          if (page === 'course-plan.html') {
            showHideCourseList();
            courseLists(0,'all_courses');
            document.querySelectorAll(".remove-button").forEach(button => {
              button.style.display = "none"; // Hide remove buttons
            });
            generateSchedule();
            loadCourses();
            prefBtn();
            generateBtn();
            selectFields();
            applyFulfilledSelections();
            loadCoursePlanData();
            runModel();
          }

          if (page === 'student-info.html') {
            termGPA();
            updateCumulativeGPA();
            updateUnitProgress();
            residency();
            otherScorecards();
          }

          if (page === 'spmf.html'){
            plotCompleted();
            runDynamicSPMF();
            updateUnitProgress();
            reqBtn();
            previewSPMF();
          }

          if (page === 'course-analytics.html') {
            passingRate();
            difficultyLevel();
            enrollment();
          }
      })
      .catch(error => {
          content.innerHTML = "Error loading content.";
          console.error("Error:", error);
      });
}

// Function to show and hide courseList-container
function showHideCourseList() {
  const modifyButton = document.getElementById("modify-button");
  const saveButton = document.getElementById("save-button");
  //const finalizeButton = document.getElementById("finalize-button");
  const courseListContainer = document.querySelector(".courseList-container");

  modifyButton.addEventListener("click", function () {
    courseListContainer.classList.remove("hide"); // Show course list
    modifyButton.style.display = "none"; // Hide modify button
    //finalizeButton.style.display = "none"
    saveButton.classList.remove("hidden"); // Enable save button

    // Select all remove buttons (including newly added ones)
    document.querySelectorAll(".remove-button").forEach(button => {
      button.style.display = "inline-block"; // Show remove buttons
    });
  });

  saveButton.addEventListener("click", function () {
    courseListContainer.classList.add("hide"); // Hide course list
    modifyButton.style.display = "block"; // Show modify button again
    //finalizeButton.style.display ="block"
    saveButton.classList.add("hidden"); // Disable save button

    // Select all remove buttons (including newly added ones)
    document.querySelectorAll(".remove-button").forEach(button => {
      button.style.display = "none"; // Hide remove buttons
    });
  });
}

// Start of course planning 
let coursePlan = JSON.parse(localStorage.getItem("coursePlan")) || []; 
let courseInfo = [];
let courseOfferings = []; // Store data globally
let addToCoursePlan;

let alertActive = false;

// Loading data to the course list, adding courses into the course plan
function courseLists(index, category) {
  const tabs = document.querySelectorAll(".tab1");

  // Update active state
  tabs.forEach((tab, i) => {
      if (i === index) {
          tab.classList.add("active1");
          tab.classList.remove("inactive1");
      } else {
          tab.classList.add("inactive1");
          tab.classList.remove("active1");
      }
  });

  let courseInfoHTML = document.querySelector('.course-list');
  let coursePlanHTML = document.querySelector('.course-plan');
  let totalUnitsText = document.querySelector('.total-units');
  let overallDiffText = document.getElementById("overallDiff");
  let predGPAText = document.getElementById("predGPA");

  let totalUnits = 0;
  let predGPA = 0;
  let avgPercDiff = 0; 

  // Function to Add Course data to Course List
  const addDataToHTML = () => {
    courseInfoHTML.innerHTML = '';
    if (courseInfo.length > 0) {
      courseInfo.forEach(course => {
        let newCourse = document.createElement('tr');
        newCourse.classList.add('course-info');
        newCourse.dataset.code = course.code;
        let properName = course.code.startsWith("HK 12") ? "HK 12" : course.code;
        let gradeFixed = !isNaN(course.predictedgrade) ? course.predictedgrade.toFixed(2) : course.predictedgrade;

        newCourse.innerHTML = `
          <td>${properName}</td>
          <td>${course.title}</td>
          <td>${course.units}</td>
          <td class="difficulty">${course.difficulty}</td>
          <td class="performance">${gradeFixed}</td>
          <td>
            <button class="view-button bg-green button txt-white">View Info</button>
            <button class="add-button bg-blue button txt-white">Add</button>
          </td>`;
        courseInfoHTML.appendChild(newCourse);
      });
    }
  }

  // Event Listener for Add Button
  courseInfoHTML.addEventListener('click', (event) => {
    courseInput.value = ""; 
    isFiltered = false; // Filter resets when a course is added
    filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`; 
    
    document.addEventListener('click', (event) => {
      const positionClick = event.target;

      if (positionClick.classList.contains('add-button')) {
        if (positionClick.disabled) return; // prevent spamming

        positionClick.disabled = true;
        setTimeout(() => positionClick.disabled = false, 500); // Re-enable after 0.5s

        const row = positionClick.closest('tr');
        if (row) {
          const course_code = row.dataset.code;
          addToCoursePlan(course_code);
        }
      }
    });
  });

  // Function to Add Course to Course Plan
  addToCoursePlan = (course_code) => {
    // Ensure course offerings are loaded before proceeding
    if (courseOfferings.length === 0) {
      showAlert("Course offerings data is not yet loaded. Please try again.");
      return;
    }

    // Find the course in course-offerings.json
    let courseOffering = courseOfferings.find(course => course.code === course_code);

    // Check if the course exists and has a valid section
    if (!courseOffering || !courseOffering.sections || courseOffering.sections.length === 0) {
      showAlert("This course cannot be added because it has no available sections.");
      return;
    }

    let courseIndex = courseInfo.findIndex(course => course.code === course_code);
    
    if (courseIndex >= 0) {
        let selectedCourse = courseInfo[courseIndex];
        let courseUnits = !isNaN(selectedCourse.units) ? Number(selectedCourse.units) : 0;

        recalculateTotalUnits();
        
        // Check if adding the course will exceed 21 units
        if (totalUnits + courseUnits > 21) {
          showAlert("Adding this course will exceed the maximum allowed number of units.");
        return; // Prevent adding the course when it exceeds 
        }

        if (!coursePlan.some(course => course.course_code === course_code)) {
            coursePlan.push(selectedCourse);

            if (!isNaN(selectedCourse.units)) {
              totalUnits += Number(selectedCourse.units);  
            }
            recalculateTotalUnits();

            localStorage.setItem("coursePlan", JSON.stringify(coursePlan)); // Save to localStorage

            // Remove from course list when added to course plan
            courseInfo.splice(courseIndex, 1);
            localStorage.setItem("courseList", JSON.stringify(courseInfo));
            updateCourseListHTML();
            addCourseToHTML();
            autoSchedule();
        }
    }
  }

  window.addToCoursePlan = addToCoursePlan;

  // Updating course list when course is added to the Course plan
  const updateCourseListHTML = () => {
    courseInfoHTML.innerHTML = ''; // Clear the UI
    if (courseInfo.length > 0) {
        courseInfo.forEach(course => {
            let newCourse = document.createElement('tr');
            newCourse.classList.add('course-info');
            newCourse.dataset.code = course.code;
            let gradeFixed = !isNaN(course.predictedgrade) ? course.predictedgrade.toFixed(2) : course.predictedgrade;

            newCourse.innerHTML = `
                <td>${course.code}</td>
                <td>${course.title}</td>
                <td>${course.units}</td>
                <td class="difficulty">${course.difficulty}</td>
                <td class="performance">${gradeFixed}</td>
                <td>
                    <button class="view-button bg-green button txt-white">View Info</button>
                    <button class="add-button bg-blue button txt-white" data-code="${course.code}">Add</button>
                </td>`;
            courseInfoHTML.appendChild(newCourse);
        });
    }
  };
  
  // Function to Display Course Plan in HTML
  const addCourseToHTML = () => {
    coursePlanHTML.innerHTML = '';

    if (coursePlan.length > 0) {
      coursePlan.forEach(plan => {
        let newPlan = document.createElement('tr');
        newPlan.classList.add('course-info');
        newPlan.dataset.code = plan.code; // Use plan.code directly

        // Find the course in the loaded courses to check if it has labs
        let foundCourse = courses.find(course => course.code.trim() === plan.code.trim());
        let hasLab = foundCourse && foundCourse.sections.some(section => section.lab && section.lab.length > 0);
        let properName = plan.code.startsWith("HK 12") ? "HK 12" : plan.code;
        let gradeFixed = !isNaN(plan.predictedgrade) ? plan.predictedgrade.toFixed(2) : plan.predictedgrade;

        newPlan.innerHTML = `
          <td>${properName}</td>
          <td>${plan.title}</td>
          <td>${plan.units}</td>
          <td class="difficulty">${plan.difficulty}</td>
          <td class="performance">${gradeFixed}</td>
          <td>
            <select class="sectionSelect">
            <option value="">Select a section</option>
            </select>
            ${hasLab ? `<select class="labSelect"><option value="">Select a lab</option></select>` : ""}
          </td>
          <td><div class="slots green txt-center txt-12 txt-semibold">20/20</div></td>
          <td>
            <button class="view-button bg-green button txt-white">View Info</button>
            <button class="remove-button bg-red button txt-white">Remove</button>
          </td>`; 

        coursePlanHTML.appendChild(newPlan);
        
        // Call populateSections() now that the row exists
        let sectionSelect = newPlan.querySelector(".sectionSelect");
        let labSelect = newPlan.querySelector(".labSelect");

        if (sectionSelect) {
            console.log(`Populating sections for ${plan.code}...`);
            populateSections(plan.code);
            
        }
      });
    }
    restoreDropdownSelections();
  }

  // Event listeners for Remove Buttons
  coursePlanHTML.addEventListener("click", (event) => {
    let positionRemove = event.target;
    if (positionRemove.classList.contains("remove-button")) {
      let row = positionRemove.closest('tr');
      if (row) {
        let course_code = row.dataset.code;
      removeFromCoursePlan(course_code);

        // Remove the saved section from localStorage
        let selectedSections = JSON.parse(localStorage.getItem("selectedSections")) || {};
        if (selectedSections[course_code]) {
          delete selectedSections[course_code];
          localStorage.setItem("selectedSections", JSON.stringify(selectedSections));
          loadSchedule();
        }
      }
    }
  });
  
  document.addEventListener('change', function (event) {
    if (event.target.classList.contains('sectionSelect') || event.target.classList.contains('labSelect')) {
        let row = event.target.closest('tr');
        let courseCode = row.getAttribute('data-code');
        addClass(courseCode);
        console.log(`addClass called for ${courseCode}`);
        saveDropdownSelections();
    }
  });

  // Remove course in course plan
  const removeFromCoursePlan = (course_code) => {
    let courseIndex = coursePlan.findIndex(course => course.code === course_code);

      if (courseIndex >= 0) {
        let removedCourse = coursePlan.splice(courseIndex, 1)[0]; // Remove from course plan
        if (!isNaN(removedCourse.units)) {
          totalUnits -= Number(removedCourse.units);  
        }
        recalculateTotalUnits();
        localStorage.setItem("coursePlan", JSON.stringify(coursePlan)); // Update localStorage

        // Restore the course to course list
        courseInfo.push(removedCourse);
        localStorage.setItem("courseList", JSON.stringify(courseInfo));

        // Update UI
        updateCourseListHTML();
        addCourseToHTML();
        removeClass(course_code);
      }
  }

  // calculates total units
  const updateTotalUnits = () => {
    totalUnitsText.textContent = totalUnits;
    
    let overallDiff;

    if (avgPercDiff < 2) {
      overallDiff = "Very Easy";
    } else if (avgPercDiff < 3) {
      overallDiff = "Easy";
    } else if (avgPercDiff < 4) {
      overallDiff = "Somewhat Easy";
    } else if (avgPercDiff < 5) {
      overallDiff = "Moderate";
    } else if (avgPercDiff < 6) {
      overallDiff = "Somewhat Difficult";
    } else if (avgPercDiff < 7) {
      overallDiff = "Difficult";
    } else if (avgPercDiff >= 7) {
      overallDiff = "Very Difficult";
    }

    overallDiffText.textContent = overallDiff;
    
    predGPAText.textContent = predGPA.toFixed(2);
  }

  const recalculateTotalUnits = () => {
    totalUnits = coursePlan.reduce((sum, course) => {
        return sum + (!isNaN(course.units) ? Number(course.units) : 0);
    }, 0);

    predGPA = (() => {
      let totalGradePoints = 0;
      let totalUnitsForGPA = 0;

      coursePlan.forEach(course => {
        const units = Number(course.units);
        const grade = Number(course.predictedgrade);

        if (!isNaN(units) && !isNaN(grade)) {
          totalGradePoints += grade * units;
          totalUnitsForGPA += units;
        }
      });

      return totalUnitsForGPA > 0 ? (totalGradePoints / totalUnitsForGPA) : 0;
    })();

    const difficultyMap = {
      "Very Easy": 1,
      "Easy": 2,
      "Somewhat Easy": 3,
      "Moderate": 4,
      "Somewhat Difficult": 5,
      "Difficult": 6,
      "Very Difficult": 7
    };

    avgPercDiff = (() => {
      let totalDifficulty = 0;
      let count = 0;

      coursePlan.forEach(course => {
        const diffValue = difficultyMap[course.difficulty];
        if (diffValue) {
          totalDifficulty += diffValue;
          count++;
        }
      });

      return count > 0 ? (totalDifficulty / count) : 0;
    })();

    updateTotalUnits(); 
  }
  
  // Load Courses from JSON
  const initApp = (category) => {
    Promise.all([
      fetch('../student/data/courses.json').then(res => res.json()),
    ])
      .then(([coursesData]) => {
        // STEP 1: Get all taken course codes
        const studentHistory = window.studentCourseHistory;

        if (!studentHistory || !Array.isArray(studentHistory)) {
          console.error("Invalid or missing studentCourseHistory");
          return;
        }

        getCompletedCourses(false).then(({ fulfilledPlaceholders }) => {
          const hk12Keys = Object.keys(fulfilledPlaceholders || {})
            .filter(key => /^HK 12 \(\d+\)$/.test(key)); // Matches HK 12 (1), HK 12 (2)...

          let hk12Index = 0;

          studentHistory.forEach(term => {
            term.courses.forEach(course => {
              if (course.code === "HK 12" && hk12Index < hk12Keys.length) {
                // Replace with sequential HK 12 (1), (2), (3)
                course.code = hk12Keys[hk12Index];
                hk12Index++;
              }
            });
          });

          const takenCourseCodes = studentHistory
            .flatMap(term => term.courses)
            .filter(course => {
              const grade = parseFloat(course.grade)
                if (course.grade === "INC" || course.grade === "DRP" || course.grade === "U") return false;
                if (!isNaN(grade) && (grade === 4 || grade === 5)) return false;
                if (course.code.startsWith("IE 200")) return false;
                return true;
            })
            .map(course => course.code);

          let freshCourseInfo;

          if (category === 'all_courses') {
            // Flatten all categories into one array and filter out taken courses
            freshCourseInfo = Object.keys(coursesData)
              .filter(key => Array.isArray(coursesData[key]))
              .flatMap(key => coursesData[key])
              .filter(course => !takenCourseCodes.includes(course.code));
          } else {
            // Just one category, filter out taken courses
            freshCourseInfo = coursesData[category].filter(
              course => !takenCourseCodes.includes(course.code)
            );
          }

          // Filter out courses already added to the current plan
          courseInfo = freshCourseInfo.filter(course =>
            !coursePlan.some(plan => plan.code === course.code)
          );

          // Save filtered category list
          localStorage.setItem("courseList", JSON.stringify(courseInfo));

          // Save full unfiltered all_courses list to localStorage if needed elsewhere
          const allCourses = Object.keys(coursesData)
            .filter(key => Array.isArray(coursesData[key]))
            .flatMap(key => coursesData[key]);

          localStorage.setItem("all_courses", JSON.stringify(allCourses));

          recalculateTotalUnits();
          addDataToHTML();
        })
        .catch(error => {
          console.error("Error fetching course or history data:", error);
        });

        addCourseToHTML();
      });
    };
  
  initApp(category);

  // Fetch course offerings when the page loads
  const fetchCourseOfferings = async () => {
    try {
      let response = await fetch('../student/data/course-offerings.json');
      courseOfferings = await response.json();
      console.log("Loaded course offerings:", courseOfferings);
    } catch (error) {
      console.error("Error fetching course offerings:", error);
    }
  };
  // Call fetch when the page loads
  fetchCourseOfferings();

  // filter function
  const filterButton = document.getElementById("filter");
  const courseInput = document.getElementById("course-input");

  // Track filter state
  let isFiltered = false;

  // Function to filter courses
  const filterCourses = () => {
      let searchCode = courseInput.value.trim().toUpperCase(); // Get input & normalize
      let courseRows = document.querySelectorAll(".course-list .course-info"); // Get course rows
      let found = false;

      courseRows.forEach(row => {
        let courseCode = row.dataset.code.toUpperCase();
        if (courseCode.includes(searchCode)) {
            row.style.display = ""; // Show matching courses
            found = true;
        } else {
            row.style.display = "none"; // Hide non-matching courses
        }
      });

      if (!found) {
          courseInfoHTML.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Try searching in other categories.</td></tr>`;
      }

      // Change button to "Reset Filter"
      filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Reset Filter</span>`;
      isFiltered = true;
  };

  // Function to reset filter
  const resetFilter = () => {
      let courseRows = document.querySelectorAll(".course-list .course-info");
      courseRows.forEach(row => {
          row.style.display = ""; // Show all courses
      });

      // Restore original course list
      updateCourseListHTML();

           // Reset button text
      filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`;
      isFiltered = false;
  };

  // Add event listener to filter button
  filterButton.addEventListener("click", () => {
      if (isFiltered) {
          resetFilter();
      } else {
          filterCourses();
      }
  });
  
  // Reset filter state when changing tabs
  isFiltered = false;
  filterButton.innerHTML = `<span class="material-symbols-outlined">
            filter_alt</span>
          <span class="txt-14 txt-semibold">Apply Filter</span>`; 
}

// start of scheduling functions
function generateSchedule() {
  let scheduleBody = document.getElementById('scheduleBody');
  scheduleBody.innerHTML = '';
  
  for (let hour = 7; hour < 19; hour++) {
      let displayHour = (hour > 12) ? hour - 12 : hour; // Convert 13-19 to 1-7, keep 12 as 12
      let nextDisplayHour = ((hour + 1) > 12) ? (hour + 1) - 12 : (hour + 1); // Ensure next hour follows 12-hour format
      
      let row = `<tr>`;
      row += `<td>${displayHour} - ${nextDisplayHour}</td>`; // Fixing display range
  
      for (let day = 0; day < 5; day++) {
          row += `<td id="${hour}-${day}" style="position: relative;"></td>`;
      }
  
      row += `</tr>`;
      scheduleBody.innerHTML += row;
    }
  
  loadSchedule();
}
  
//start of scheduling function
let courses = [];         // Global courses array
let matchedCourses = [];  // Make matchedCourses global
let classList = new Set();
//let scheduledClasses = [];
let scheduledClasses = JSON.parse(localStorage.getItem("scheduledClasses")) || []; // Stores all added class schedules

async function loadCourses() {
  try {
    let response = await fetch('../student/data/course-offerings.json');
    courses = await response.json(); // Store data globally

    let coursesResponse = await fetch ('../student/data/courses.json');
    coursesData = await coursesResponse.json();

    let allCourses = Object.values(coursesData).flat();

    console.log("Loaded Courses:", courses);
    console.log("All Courses", allCourses);

    // Store matchedCourses globally
    matchedCourses = allCourses.map(courseEntry => {
      let foundCourse = courses.find(course => courseEntry.code.trim() === course.code.trim());

      if (!foundCourse) {
          console.warn(`Course not found: ${courseEntry.code}`);
      }

      return foundCourse;
    }).filter(course => course); // Remove null values

    console.log("Matched Courses:", matchedCourses);

    matchedCourses.forEach(course => {
      console.log("Calling populateSections with:", course.code);
      populateSections(course.code);
    });

  } catch (error) {
    console.error('Error loading courses:', error);
  }
}

// Populate Sections
const populateSections = (courseCode) => {
    let foundCourse = matchedCourses.find(course => course.code === courseCode);
    
    if (!foundCourse) {
        console.error(`No course found for: ${courseCode}`);
        return;
    }

    console.log("Populated sections for:", courseCode, foundCourse.sections);

    let sectionSelect = document.querySelector(`tr[data-code="${courseCode}"] .sectionSelect`);
    let labSelect = document.querySelector(`tr[data-code="${courseCode}"] .labSelect`);

       // Clear dropdown before adding new options
    sectionSelect.innerHTML = '<option value="">Select a section</option>';

    foundCourse.sections.forEach(section => {
        let option = document.createElement('option');
        option.value = JSON.stringify(section);
        option.textContent = `${section.label} - ${section.sched}`;
        sectionSelect.appendChild(option);
    });

    // Listen for section changes to populate labs dynamically
    sectionSelect.addEventListener('change', function () {
        labSelect.innerHTML = '<option value="">Select a lab</option>'; // Reset lab options
        let selectedSection = JSON.parse(sectionSelect.value);

        if (selectedSection.lab) {
            selectedSection.lab.forEach(labSection => {
                let labOption = document.createElement('option');
                labOption.value = JSON.stringify(labSection);
                labOption.textContent = `${selectedSection.label}${labSection.lab_label} - ${labSection.lab_sched}`;
                labSelect.appendChild(labOption);
            });
        }
    });
};

// Call loadCourses when the page loads
loadCourses();

function parseSchedule(schedule) {
  let [days, timeRange] = schedule.split('|').map(s => s.trim());
  let [startTime, endTime] = timeRange.split('-').map(t => convertTo24Hour(t.trim()));
  let dayIndices = mapDaysToIndices(days);
  return { dayIndices, startTime, endTime };
}

function mapDaysToIndices(days) {
  const dayMap = { "M": 0, "T": 1, "W": 2, "Th": 3, "F": 4 };
  let dayIndices = [];
  let i = 0;
  while (i < days.length) {
      if (days[i] === "T" && i + 1 < days.length && days[i + 1] === "h") {
          dayIndices.push(dayMap["Th"]);
          i += 2;
      } else {
          dayIndices.push(dayMap[days[i]]);
          i++;
      }
  }
  return dayIndices;
}

function convertTo24Hour(time) {
  let [hour, min, meridian] = time.match(/(\d+):(\d+) (\w+)/).slice(1);
  hour = parseInt(hour);
  min = parseInt(min);
  if (meridian === 'PM' && hour !== 12) hour += 12;
  if (meridian === 'AM' && hour === 12) hour = 0;
  return { hour, min };
}

function checkTimeConflict(dayIndices, startTime, endTime) {
  let startMinutes = startTime.hour * 60 + startTime.min;
  let endMinutes = endTime.hour * 60 + endTime.min;

  for (let scheduledClass of scheduledClasses) { // Use a proper schedule storage
      let { dayIndices: existingDays, startTime: existingStart, endTime: existingEnd } = scheduledClass;

      let existingStartMinutes = existingStart.hour * 60 + existingStart.min;
      let existingEndMinutes = existingEnd.hour * 60 + existingEnd.min;

      for (let day of dayIndices) {
          if (existingDays.includes(day)) {
              // Check if there is an overlap
              if (startMinutes < existingEndMinutes && endMinutes > existingStartMinutes) {
                  return true; // Conflict detected
              }
          }
      }
  }
  return false; // No conflict
}

function addClass(courseCode) {
  let row = document.querySelector(`tr[data-code="${courseCode}"]`);
  if (!row) {
    console.error(`Row with courseCode ${courseCode} not found.`);
    return;
  }

  let sectionSelect = row.querySelector(".sectionSelect");
  let labSelect = row.querySelector(".labSelect");

  let section = JSON.parse(sectionSelect.value);
  let lab = labSelect && labSelect.value ? JSON.parse(labSelect.value) : null;

  console.log("Selected Section:", section);
  console.log("Selected Course:", courseCode);

  let classKey = `${courseCode}-`;
  
  // Remove previously selected section
  removeClass(courseCode);

  // Extract lecture schedule
  let { dayIndices, startTime, endTime } = parseSchedule(section.sched);
  classKey += section.label;

  // If course requires a lab but no lab is selected, prevent adding
  if (section.lab && section.lab.length > 0 && !lab) {
    return;
  }

  // Check for time conflicts in the lecture
  if (checkTimeConflict(dayIndices, startTime, endTime)) {
    alert("Time conflict detected! This section overlaps with another scheduled class.");
    sectionSelect.value = "";
    labSelect.value = "";
    return;
  }

  // If there's a lab, extract its schedule and check for conflicts
  if (lab) {
    let { dayIndices: labDays, startTime: labStart, endTime: labEnd } = parseSchedule(lab.lab_sched);
    let labKey = `${classKey}-${lab.lab_label}`;

    if (checkTimeConflict(labDays, labStart, labEnd)) {
      alert("Time conflict detected in the lab section! The class will not be added.");
      labSelect.value = "";
      return; // Prevent both lecture and lab from being added
    }

    // Add lab to schedule if no conflicts
    scheduledClasses.push({ courseCode, section, labKey, dayIndices: labDays, startTime: labStart, endTime: labEnd });
    plotSchedule(courseCode, section, lab, labStart, labEnd, labDays, labKey, true);
    classList.add(labKey);

    saveSchedule();
  }

  // Add lecture to schedule after lab check passes
  scheduledClasses.push({ courseCode, section, classKey, dayIndices, startTime, endTime });
  plotSchedule(courseCode, section, null, startTime, endTime, dayIndices, classKey, false);
  classList.add(classKey);

  saveSchedule();
}

function plotSchedule(courseCode, section, lab, startTime, endTime, dayIndices, classKey, isLab) {
  for (let day of dayIndices) {
    let firstCell = document.getElementById(`${startTime.hour}-${day}`);
    if (firstCell) {
      let entry = document.createElement("div");
      entry.className = "class-entry";
      entry.style.backgroundColor = isLab ? "#8d1436" : ""; 

      let displaySHour = startTime.hour > 12 ? startTime.hour - 12 : startTime.hour;
      let displayEhour = endTime.hour > 12 ? endTime.hour - 12 : endTime.hour;
      let displaySMin = startTime.min === 30 ? "30" : "00";
      let displayEMin = endTime.min === 30 ? "30" : "00";
      let properName = courseCode.startsWith("HK 12") ? "HK 12" : courseCode;
      let properLab = isLab ? `${lab.lab_label}`: "";

      entry.innerText = `${properName} ${section.label}${properLab} ${displaySHour}:${displaySMin} - ${displayEhour}:${displayEMin}`;
      entry.dataset.className = classKey;

      let height = ((endTime.hour * 60 + endTime.min) - (startTime.hour * 60 + startTime.min)) / 60 * 28;
      let topOffset = startTime.min === 30 ? "50%" : "0";

      entry.style.height = `${height}px`;
      entry.style.top = topOffset;

      firstCell.appendChild(entry);
    }
  }
}

function removeClass(courseCode) {
  // Filter out previous section instances from scheduledClasses
  scheduledClasses = scheduledClasses.filter(cls => cls.courseCode !== courseCode);

  // Remove plotted entries in the schedule grid
  document.querySelectorAll(`.class-entry[data-class-name^="${courseCode}-"]`).forEach(el => el.remove());
  classList.delete(courseCode);

  saveSchedule();
}

function saveSchedule() {
  localStorage.setItem("scheduledClasses", JSON.stringify(scheduledClasses));
  console.log("Saved Classes:", scheduledClasses);
}

console.log(localStorage.getItem("scheduledClasses"));
console.log(localStorage.getItem("coursePlan"));

function loadSchedule() {
  let savedClasses = localStorage.getItem("scheduledClasses");
  console.log("Loaded schedule:", scheduledClasses); // Debugging

  if (savedClasses) {
      scheduledClasses = JSON.parse(savedClasses);
      scheduledClasses.forEach(cls => {

        console.log(`plotSchedule called with: ${cls.courseCode}, Section: ${JSON.stringify(cls.section)}, 
        Time: ${cls.startTime.hour}:${cls.startTime.min} - ${cls.endTime.hour}:${cls.endTime.min}, 
        Days: ${cls.dayIndices}`);
    
        plotSchedule(
            cls.courseCode, 
            cls.section,
            null, 
            cls.startTime, 
            cls.endTime, 
            cls.dayIndices, 
            cls.classKey, 
            false
        );
        classList.add(cls.courseCode);
    });
  }
}

function saveDropdownSelections() {
  let selectedSections = JSON.parse(localStorage.getItem("selectedSections")) || {};

  document.querySelectorAll("tr[data-code]").forEach(row => {
    let courseCode = row.getAttribute("data-code");
    let sectionSelect = row.querySelector(".sectionSelect");
    let labSelect = row.querySelector(".labSelect");

    if (!selectedSections[courseCode]) {
      selectedSections[courseCode] = {};
    }

    if (sectionSelect) {
      selectedSections[courseCode].section = sectionSelect.value;
    }

    if (labSelect && labSelect.value !== "") { // Ensure lab selection is stored
      selectedSections[courseCode].lab = labSelect.value;
    }
  });

  localStorage.setItem("selectedSections", JSON.stringify(selectedSections));
  console.log("Saved Dropdown Selections:", selectedSections);
}

function restoreDropdownSelections() {
  let savedSelections = JSON.parse(localStorage.getItem("selectedSections")) || {};
  console.log("Restoring selections:", savedSelections);

  document.querySelectorAll("tr[data-code]").forEach(row => {
    let courseCode = row.getAttribute("data-code");
    let sectionSelect = row.querySelector(".sectionSelect");
    let labSelect = row.querySelector(".labSelect");

    if (sectionSelect && savedSelections[courseCode]?.section) {
      sectionSelect.value = savedSelections[courseCode].section;

      // Trigger lab population dynamically
      sectionSelect.dispatchEvent(new Event("change")); 

      setTimeout(() => {
        if (labSelect && savedSelections[courseCode]?.lab) {
          labSelect.value = savedSelections[courseCode].lab;
        }
      }, 100); // Small delay to allow population before setting value
    }
  });
}

function prefBtn() {
  const prefButton = document.querySelector(".preferences-button");
  const saveButton = document.querySelector(".savePref-button");
  const saveContainer = document.querySelector(".button-save");
  const prefListContainer = document.querySelector(".prefList-container");

  prefButton.addEventListener("click", () => {
    prefListContainer.classList.remove("hide");
    prefButton.style.display = "none";
    saveContainer.classList.remove("hidden")
  })

  saveButton.addEventListener("click", () => {
    prefListContainer.classList.add("hide");
    prefButton.style.display = "flex";
    saveContainer.classList.add("hidden");
    onProceedToSPMF();
  })
}

function reqBtn() {
  const button = document.querySelector(".request-button");

    if (button) {
      button.addEventListener("click", () => {
        const overlay = document.getElementById("requestOverlay");
        const iframe = document.getElementById("requestIframe");
    
        if (overlay && iframe) {
          overlay.classList.remove("hidden");
          iframe.src = "request-form.html";
        }
      });
    }
    
    // Listen to message from iframe
    window.addEventListener('message', (event) => {
      if (event.data === 'closeOverlay') {
        overlay.classList.add("hidden");
        iframe.src = "";
      }
    });
}

function generateBtn() {
  const button = document.querySelector(".generate-button");

  if (button) {
    button.addEventListener("click", async () => {
      const schedule = window.schedule;

      if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
        console.warn("Schedule not available.");
        return;
      }

      const coursePlanCourses = schedule[0].courses; // Get courses in Term 1
      
      for (const course of coursePlanCourses) {
        const courseCode = course.code || course.subject || course.courseCode;
        if (courseCode && typeof addToCoursePlan === "function") {
          await addToCoursePlan(courseCode);
        }
      }

      autoSchedule();
    });
  }
}

async function autoSchedule() {
  localStorage.removeItem("scheduledClasses");
  
  const coursePlan = JSON.parse(localStorage.getItem("coursePlan") || "[]");
  const courseCodes = coursePlan.map(c => c.code);

  const res = await fetch("../student/data/course-offerings.json");
  const offerings = await res.json();

  const courseOptions = courseCodes.map(code => {
    const offering = offerings.find(c => c.code === code);
    if (!offering) return null;

    return {
      code,
      options: offering.sections.flatMap(section => {
        if (section.lab && Array.isArray(section.lab)) {
          return section.lab.map(lab => ({ section, lab }));
        } else {
          return [{ section, lab: null }];
        }
      })
    };
  });

  if (courseOptions.includes(null)) {
    console.warn("Some courses not found in offerings.");
    return;
  }

  const parseTimeBlock = (schedStr) => {
    const [days, times] = schedStr.split("|").map(s => s.trim());
    const [start, end] = times.split("-").map(t => t.trim());
    return days.split(/(?=[A-Z])/).map(day => ({
      day,
      start: toMinutes(start),
      end: toMinutes(end)
    }));
  };

  const toMinutes = (t) => {
    const [time, modifier] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const hasConflict = (schedA, schedB) => {
    for (const blockA of schedA) {
      for (const blockB of schedB) {
        if (blockA.day === blockB.day &&
          blockA.start < blockB.end &&
          blockB.start < blockA.end) {
          return true;
        }
      }
    }
    return false;
  };

  const selected = [];
  const backtrack = (index, occupied) => {
    if (index === courseOptions.length) return true;
    const { code, options } = courseOptions[index];

    for (const option of options) {
      const sectionSched = parseTimeBlock(option.section.sched || "");
      const labSched = option.lab ? parseTimeBlock(option.lab.lab_sched || "") : [];
      const fullSched = [...sectionSched, ...labSched];

      if (occupied.some(existing => hasConflict(existing, fullSched))) continue;

      selected.push({ code, section: option.section, lab: option.lab });
      occupied.push(fullSched);

      if (backtrack(index + 1, occupied)) return true;

      selected.pop();
      occupied.pop();
    }
    return false;
  };

  const success = backtrack(0, []);
  if (!success) {
    alert("No conflict-free schedule could be generated.");
    return;
  }

  // Apply the selected sections/labs
  for (const { code, section, lab } of selected) {
    const tryApplySection = () => {
      const row = document.querySelector(`tr[data-code="${code}"]`);
      if (!row) return false;

      const sectionSelect = row.querySelector(".sectionSelect");
      const labSelect = row.querySelector(".labSelect");

      const sectionValue = JSON.stringify(section);
      const foundSection = Array.from(sectionSelect.options).find(opt => opt.value === sectionValue);
      if (foundSection) {
        sectionSelect.value = sectionValue;
        sectionSelect.dispatchEvent(new Event("change")); // load labs
      }

      if (lab && labSelect) {
        const labValue = JSON.stringify(lab);
        const foundLab = Array.from(labSelect.options).find(opt => opt.value === labValue);
        if (foundLab) {
          labSelect.value = labValue;
        }
      }

      return true;
    };

    let retries = 0;
    const maxRetries = 10;
    const interval = setInterval(() => {
      const success = tryApplySection();
      if (success || ++retries >= maxRetries) {
        clearInterval(interval);
        if (success) {
          saveDropdownSelections();
          addClass(code);
        }
      }
    }, 100);
  }
}

function showAlert(message) {
  if (alertActive) return; // Block if an alert is already showing

  alertActive = true;
  setTimeout(() => {
    alert(message);
    alertActive = false;
  }, 0);
}

function selectFields() {
  const selectCognate1 = document.getElementById('cognate_1');
  const selectCognate2 = document.getElementById('cognate_2');

  function updateCognates(changedSelect, otherSelect) {
    const selectedValue = changedSelect.value;

    // Enable all options in the other select
    Array.from(otherSelect.options).forEach(option => {
      option.disabled = false;
    });

    // Disable the selected option in the other select
    Array.from(otherSelect.options).forEach(option => {
      if (option.value === selectedValue) {
        option.disabled = true;
      }
    });
  }
  
  // Initial update in case there are defaults
  updateCognates(selectCognate1, selectCognate2);
  updateCognates(selectCognate2, selectCognate1);

  // Add event listeners
  selectCognate1.addEventListener('change', () => {
    updateCognates(selectCognate1, selectCognate2);
  });

  selectCognate2.addEventListener('change', () => {
    updateCognates(selectCognate2, selectCognate1);
  });

  const geSelects = [
    document.getElementById('ge_1'),
    document.getElementById('ge_2'),
    document.getElementById('ge_3')
  ];

  function updateGE() {
    // Get current selections
    const selectedValues = geSelects.map(select => select.value);

    // For each select
    geSelects.forEach((select, idx) => {
      // Enable all options first
      Array.from(select.options).forEach(option => {
        option.disabled = false;
      });

      // Disable options selected in other selects
      selectedValues.forEach((value, selectedIdx) => {
        if (selectedIdx !== idx) {
          Array.from(select.options).forEach(option => {
            if (option.value === value) {
              option.disabled = true;
            }
          });
        }
      });
    });
  }

  // Add listeners
  geSelects.forEach(select => {
    select.addEventListener('change', updateGE);
  });

  // Initial run
  updateGE();

  // button events
  const select = document.getElementById('units');
  const selectDiff = document.getElementById('difficulty');
  const selectThesis = document.getElementById('ie200');

  select.disabled = false;
  selectDiff.disabled = false;
  selectCognate1.disabled = false;
  selectCognate2.disabled = false;
  selectThesis.disabled = false;
}

async function getCompletedCourses(includePlannedCourses = false) {
  const studentHistory = window.studentCourseHistory;
  const curriculumCourses = await getCurriculumCourses();

  // Optional: load planned courses from localStorage
  let plannedCourses = [];
  if (includePlannedCourses) {
    try {
      plannedCourses = JSON.parse(localStorage.getItem("coursePlan")) || [];
    } catch {
      plannedCourses = [];
    }
  }

  // Category options
  const geOptions = [
    "SAS 1", "MATH 10", "SCIENCE 11", "HUM 3", "KAS 4",
    "PHILARTS 1", "PHLO 1", "PS 21", "SCIENCE 10", "SOSC 3", "WIKA 1"
  ];
  const cognateOptions = ["MGT 131", "MGT 133", "CHE 180", "IE 191", "CMSC 21", "CMSC 22"];
  const capstoneOptions = ["IE 200", "IE 200B", "IE 200C"];
  const historyOptions = ["KAS 1", "HIST 1"];
  const physOptions = ["PHYS 51", "PHYS 71"];
  const physLabOptions = ["PHYS 51.1", "PHYS 71.1"];
  const HKOptions = ["HK 12"];

  // Placeholders from curriculum
  const gePlaceholders = curriculumCourses.filter(c => c.code.startsWith("GE Elective"));
  const cognatePlaceholders = curriculumCourses.filter(c => c.code.startsWith("Cognate"));
  const capstonePlaceholders = curriculumCourses.filter(c => c.code.startsWith("IE 200/B/C"));
  const historyPlaceholders = curriculumCourses.filter(c => c.code.startsWith("KAS 1/HIST 1"));
  const physPlaceholders = curriculumCourses.filter(c => c.code.startsWith("PHYS 51"));
  const physLabPlaceholders = curriculumCourses.filter(c => c.code.startsWith("PHYS 51.1"));
  const HKPlaceholders = curriculumCourses.filter(c => c.code.startsWith("HK 12"));

  // Helper: grade check
  const isPassingGrade = grade => {
    const num = parseFloat(grade);
    return (num <= 4 && !isNaN(num)) || grade === "S" || grade === "INC";
  };

  // Step 1: completed courses from student history
  let completedFlat = studentHistory.flatMap(term => term.courses);

  // If we are NOT including planned courses, filter only passing grades
  if (!includePlannedCourses) {
    completedFlat = completedFlat.filter(course => isPassingGrade(course.grade));
  }

  // Step 2: If including planned courses, merge them in
  if (includePlannedCourses && plannedCourses.length > 0) {
    // Planned courses may only have courseCode/code, so normalize
    plannedCourses.forEach(pc => {
      if (!completedFlat.find(c => c.code === pc.code)) {
        completedFlat.push({ ...pc, grade: null }); // No grade yet
      }
    });
  }

  // Utility to map placeholders
  const createFulfilledMapping = (options, placeholders) => {
    const fulfilled = {};
    let index = 0;
    for (const course of completedFlat) {
      if (options.includes(course.code) && index < placeholders.length) {
        const placeholder = placeholders[index];
        fulfilled[placeholder.code] = course.code;
        index++;
      }
    }
    return fulfilled;
  };

  // Build fulfilled placeholder maps
  const fulfilledMap = {
    ...createFulfilledMapping(geOptions, gePlaceholders),
    ...createFulfilledMapping(cognateOptions, cognatePlaceholders),
    ...createFulfilledMapping(capstoneOptions, capstonePlaceholders),
    ...createFulfilledMapping(historyOptions, historyPlaceholders),
    ...createFulfilledMapping(physOptions, physPlaceholders),
    ...createFulfilledMapping(physLabOptions, physLabPlaceholders),
    ...createFulfilledMapping(HKOptions, HKPlaceholders)
  };

  // Map curriculum for unit lookups
  const curriculumMap = new Map(curriculumCourses.map(c => [c.code, c]));

  // Build completedTerms array from student history
  const completedTerms = studentHistory.map(term => ({
    term: term.term,
    courses: term.courses.map(course => {
      let courseInfo = curriculumMap.get(course.code);
      if (!courseInfo) {
        const placeholder = Object.entries(fulfilledMap)
          .find(([, value]) => value === course.code)?.[0];
        courseInfo = placeholder ? curriculumMap.get(placeholder) : {};
      }
      return {
        ...course,
        units: courseInfo?.units ?? undefined,
        fulfilledPlaceholder:
          Object.keys(fulfilledMap).find(key => fulfilledMap[key] === course.code) || null
      };
    })
  }));

  // If includePlannedCourses is true, treat coursePlan as another term
  if (includePlannedCourses) {
    const coursePlan = JSON.parse(localStorage.getItem("coursePlan")) || [];
    if (coursePlan.length > 0) {
      completedTerms.push({
        term: "Planned Courses",
        courses: coursePlan.map(course => {
          let courseInfo = curriculumMap.get(course.code || course.courseCode);
          if (!courseInfo) {
            const placeholder = Object.entries(fulfilledMap)
              .find(([, value]) => value === (course.code || course.courseCode))?.[0];
            courseInfo = placeholder ? curriculumMap.get(placeholder) : {};
          }
          return {
            ...course,
            code: course.code || course.courseCode,
            units: courseInfo?.units ?? undefined,
            fulfilledPlaceholder:
              Object.keys(fulfilledMap)
                .find(key => fulfilledMap[key] === (course.code || course.courseCode)) || null
          };
        })
      });
    }
  }

  return {
    completedTerms,
    fulfilledPlaceholders: fulfilledMap
  };
}

async function getCurriculumCourses() {
  const res = await fetch('../student/data/courses-curriculum.json');
  return await res.json();
}

async function applyFulfilledSelections() {
  const { fulfilledPlaceholders } = await getCompletedCourses(false);

  const placeholderToSelectId = {
    'GE Elective (1)': 'ge_1',
    'GE Elective (2)': 'ge_2',
    'GE Elective (3)': 'ge_3',
    'Cognate (1)': 'cognate_1',
    'Cognate (2)': 'cognate_2',
    'IE 200/B/C (1)': 'ie200',
    'IE 200/B/C (2)': 'ie200'
  };

  // Helper to normalize strings for comparison
  const norm = s => (s === undefined || s === null) ? '' : String(s).trim();

  for (const [placeholderRaw, courseCodeRaw] of Object.entries(fulfilledPlaceholders)) {
    const placeholder = norm(placeholderRaw);
    const courseCode = norm(courseCodeRaw);
    if (!courseCode) continue;

    // 1) Try mapped id first
    const mappedId = placeholderToSelectId[placeholder];
    let select = mappedId ? document.getElementById(mappedId) : null;

    // 2) If mapped select not found or doesn't have the option, try to find a matching select anywhere
    const hasOption = sel => Array.from(sel.options).some(opt => norm(opt.value || opt.text) === courseCode);

    if (!select || !hasOption(select)) {
      // find any select whose options contain the course code
      select = Array.from(document.querySelectorAll('select')).find(sel => hasOption(sel)) || null;
    }

    if (!select) {
      console.warn(`No select found for placeholder "${placeholder}" / course "${courseCode}"`);
      continue;
    }

    // If select is already auto-fulfilled with a different value, try to find another select that fits
    if (select.dataset.autoFulfilled === '1' && norm(select.value) !== courseCode) {
      // try to find another select that contains the option and is not locked
      const alt = Array.from(document.querySelectorAll('select'))
        .find(s => s.dataset.autoFulfilled !== '1' && hasOption(s));
      if (alt) select = alt;
      else {
        console.warn(`All selects containing ${courseCode} are already locked.`);
        continue;
      }
    }

    // Find the option (match by value or visible text)
    const foundOption = Array.from(select.options).find(opt => norm(opt.value || opt.text) === courseCode);

    if (!foundOption) {
      console.warn(`Option "${courseCode}" not found in select#${select.id || '(no-id)'}`);
      continue;
    }

    // Apply selection and lock it
    select.value = foundOption.value;
    // dispatch change so dependent logic runs (lab loaders, etc.)
    select.dispatchEvent(new Event('change', { bubbles: true }));

    // Mark as auto-fulfilled and disable
    select.dataset.autoFulfilled = '1';
    select.disabled = true;

    console.log(`Auto-selected & locked ${courseCode} on select#${select.id || '(no-id)'}`);
  }

  // Re-run your disable/update logic (if any)
  if (typeof selectFields === 'function') selectFields();

  // Some other logic might re-enable selects — re-lock any autoFulfilled selects after a short delay
  setTimeout(() => {
    document.querySelectorAll('select[data-auto-fulfilled="1"]').forEach(s => s.disabled = true);
  }, 50);
}

applyFulfilledSelections();

// plotting completed courses

let globalUnitsCompleted = 0;
let globalResidency = 0;

async function plotCompleted() {
  const { completedTerms } = await getCompletedCourses(false);

  const container = document.getElementById('completed');
  container.innerHTML = '';

  let totalResidency = 0;
  let totalUnitsCompleted = 0;
  let sumGradePoints = 0;
  let sumUnitsForGPA = 0;

  completedTerms.forEach(term => {
    const termUnits = term.courses.reduce((sum, course) => {
      const grade = String(course.grade).toUpperCase();
      if (["5", "U", "DRP"].includes(grade)) return sum;
      return Number.isFinite(course.units) ? sum + course.units : sum;
    }, 0);

    totalUnitsCompleted += termUnits;

    let termGradePoints = 0;
    let termUnitsForGPA = 0;

    term.courses.forEach(course => {
      if (Number.isFinite(course.grade) && Number.isFinite(course.units)) {
        termGradePoints += course.grade * course.units;
        termUnitsForGPA += course.units;
      }
    });

    const termGPA = termUnitsForGPA > 0 ? (termGradePoints / termUnitsForGPA).toFixed(2) : 'N/A';

    sumGradePoints += termGradePoints;
    sumUnitsForGPA += termUnitsForGPA;

    if (!term.term.includes('MIDYR') && term.courses.length > 0) {
      totalResidency += 0.5;
    }

    // Skip empty terms
    if (term.courses.length === 0) return;

    const column = document.createElement('div');
    column.className = 'term-column';

    // Header
    const header = document.createElement('div');
    header.className = 'term-header';
    header.textContent = term.term;
    column.appendChild(header);

    // Courses
    term.courses.forEach(course => {
      const pill = document.createElement('div');
      pill.className = 'course-pill';

      const grade = course.grade;

      // Apply color based on grade
      if (grade === 'S' || (typeof grade === 'number' && grade < 4)) {
        pill.classList.add('green'); // Passed
      } else if (grade === 'INC' || grade === 4) {
        pill.classList.add('purple'); // Incomplete
      } else if (grade === 'U' || grade === 'DRP' || grade === 5) {
        pill.classList.add('red'); // Failed
      }

      const displayCode = course.fulfilledPlaceholder
        ? `${course.code}` // Optional: show → placeholder
        : course.code;

      pill.textContent = `${displayCode}`;
      column.appendChild(pill);
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'term-footer';
    footer.innerHTML = `
      <div>${termUnits} units</div>
      <div>GPA: ${termGPA}</div>
    `;
    column.appendChild(footer);

    container.appendChild(column);
  });

  globalUnitsCompleted = totalUnitsCompleted;
  globalResidency = totalResidency;
}

// plotting course plan 

function onProceedToSPMF() {
  const units = document.getElementById('units').value;
  const difficulty = document.getElementById('difficulty').value;
  const cognate1 = document.getElementById('cognate_1').value;
  const cognate2 = document.getElementById('cognate_2').value;
  const ge1 = document.getElementById('ge_1').value;
  const ge2 = document.getElementById('ge_2').value;
  const ge3 = document.getElementById('ge_3').value;
  const ie200 = document.getElementById('ie200').value;

  localStorage.setItem('coursePlanData', JSON.stringify({
    units,
    difficulty,
    cognate1,
    cognate2,
    ge1,
    ge2,
    ge3,
    ie200
  }));
}

function loadCoursePlanData() {
  const data = JSON.parse(localStorage.getItem('coursePlanData'));
  if (!data) return;

  document.getElementById('units').value = data.units || '';
  document.getElementById('difficulty').value = data.difficulty || '';
  document.getElementById('cognate_1').value = data.cognate1 || '';
  document.getElementById('cognate_2').value = data.cognate2 || '';
  document.getElementById('ge_1').value = data.ge1 || '';
  document.getElementById('ge_2').value = data.ge2 || '';
  document.getElementById('ge_3').value = data.ge3 || '';
  document.getElementById('ie200').value = data.ie200 || '';
}

async function runModel() {
  const curriculumCourses = await getCurriculumCourses();
  const { completedTerms, fulfilledPlaceholders } = await getCompletedCourses(false);

  // Step 1: Get actual completed course codes (only those with passing grades)
  const completedSet = new Set(
    completedTerms.flatMap(term =>
      term.courses
        .filter(c => !(c.grade === 5 || c.grade === 'DRP' || c.grade === 'U'))
        .map(c => c.code)
    )
  );
  
  // Step 2: Add fulfilled placeholders ONLY IF the fulfilling course was passed
  Object.entries(fulfilledPlaceholders).forEach(([placeholder, actualCode]) => {
    if (completedSet.has(actualCode)) {
      completedSet.add(placeholder); // Add placeholder only if the course that fulfilled it passed
    }
  });

  console.log("Debugging completed courses", completedSet);

  // Now both actual courses and fulfilled placeholders are considered complete 
  const schedule = await generateCoursePlan(curriculumCourses, completedSet);
  await displaySchedule(schedule);

  window.schedule = schedule;
}

async function runDynamicSPMF() {
  const curriculumCourses = await getCurriculumCourses();
  const { completedTerms, fulfilledPlaceholders } = await getCompletedCourses(true);

  const coursePlanIncluded = new Set(
    completedTerms.flatMap(term =>
      term.courses
        .map(c => c.code)
    )
  );
  
  Object.entries(fulfilledPlaceholders).forEach(([placeholder, actualCode]) => {
    if (coursePlanIncluded.has(actualCode)) {
      coursePlanIncluded.add(placeholder); // Add placeholder only if the course that fulfilled it passed
    }
  });

  console.log("Debugging including course plan", coursePlanIncluded);

  const schedule1 = await generateCoursePlan(curriculumCourses, coursePlanIncluded);
  await displaySchedule(schedule1);
}

async function generateCoursePlan(courses, completedSet = new Set()) {
  let terms = Array.from({ length: 20-2*globalResidency }, () => []);
  let termUnits = new Array(20-2*globalResidency).fill(0);
    
  const placed = new Set(completedSet);

  const termNames = ["1S", "2S", "MIDYR"];

  const coursePlanData = JSON.parse(localStorage.getItem('coursePlanData') || '{}');

  const selectedUnits = parseInt(coursePlanData.units, 10);
  const termCapacity = [selectedUnits, selectedUnits, 6];
  const termMinimums = [15, 15, 0];

  const selectedDifficulty = parseFloat(coursePlanData.difficulty);
  const termDifficultyCapacity = [selectedDifficulty, selectedDifficulty, selectedDifficulty];

  const firstsem = globalResidency % 1 === 0.5;
  const adjustedResidency = firstsem ? globalResidency - 0.5 : globalResidency;
  let offset = firstsem ? 1 : 0;

  const coursePlan = JSON.parse(localStorage.getItem('coursePlan') || '[]');

  if (coursePlan.length > 0) {
    offset += 1;
  }

  const getTermLabel = (i) => {
    const termType = termNames[(i + offset) % 3];
    const year = Math.floor((i + offset) / 3) + adjustedResidency + 1;
    
    const studentHistory = window.studentCourseHistory;
    
    const sortedTerms = studentHistory
    .map(term => term.term)
    .filter(t => t.includes("AY"))
    .sort(); // this works because "AY 23-24 2ND SEM" < "AY 24-25 1ST SEM"

    const lastTerm = sortedTerms[sortedTerms.length - 1]; // e.g., "AY 24-25 1ST SEM"

    // Extract base AY
    const ayMatch = lastTerm.match(/AY (\d{2})-(\d{2}) (1ST SEM|2ND SEM|MIDYR)/);
    if (!ayMatch) return "Unknown AY";

    let startYear = parseInt(ayMatch[1]);
    let endYear = parseInt(ayMatch[2]);

    const termTypeExtended = 
      termType === "1S" ? "1ST SEM" :
      termType === "2S" ? "2ND SEM" :
      termType;

    if (globalResidency % 1 === 0.5) {
      globalResidency = Math.ceil(globalResidency);
    }

    return `AY ${startYear + year - globalResidency}-${endYear + year - globalResidency} ${termTypeExtended}`;
  };

  const parseUnitConstraint = (str) => {
    const match = str?.match(/(>=|<=|=|>|<)\s*(\d+)/);
    return match ? { op: match[1], value: parseInt(match[2]) } : null;
  };

  const accumulatedUnitsBefore = (idx) => {
    return termUnits.slice(0, idx).reduce((a, b) => a + b, 0);
  };

  const midyrsActivated = new Set();

  function canPlace(course, termIndex) {
    const termType = termNames[(termIndex + offset) % 3];

    // new code line
    if (placed.has(course.code)) return false; 

    // Only place IE 198 in its midyr
    if (course.code === "IE 198" && termType !== "MIDYR") return false;
    if (course.code !== "IE 198" && termType === "MIDYR" && !midyrsActivated.has(termIndex)) return false;

    if (!course.sem_offered.includes(termType)) return false;

    const allPrereqsMet = course.prerequisite.every(code => {
      if (completedSet.has(code)) return true; // already completed
      return terms.some((t, i) => i < termIndex && t.find(c => c.code === code));
    });
    if (!allPrereqsMet) return false;

    // Check corequisites
    const allCoreqsMet = course.corequisite.every(code => {
      if (completedSet.has(code)) return true; // already completed
      return terms.some((t, i) => i <= termIndex && t.find(c => c.code === code));
    });
    if (!allCoreqsMet) return false;

    if (course.units_taken) {
      const constraint = parseUnitConstraint(course.units_taken);
      const total = accumulatedUnitsBefore(termIndex) + globalUnitsCompleted;

      if (constraint) {
        const { op, value } = constraint;
        if (op === '>=' && !(total >= value)) return false;
        if (op === '<=' && !(total <= value)) return false;
        if (op === '=' && !(total === value)) return false;
        if (op === '>' && !(total > value)) return false;
        if (op === '<' && !(total < value)) return false;
      }
    }

    const term = terms[termIndex];

    // Additional constraints
    if (course.code.includes("HK") && term.some(c => c.code.includes("HK"))) return false;
    if (course.code.includes("Cognate") && term.some(c => c.code.includes("Cognate"))) return false;
    
    if (
      (
        course.code.includes("GE Elective") ||
        ["ENG 10", "ARTS 1", "STS 1", "KAS 1", "HIST 1", "PI 10", "ETHICS 1", "COMM 10"].includes(course.code)
      ) &&
      term.filter(c =>
        c.code.includes("GE Elective") ||
        ["ENG 10", "ARTS 1", "STS 1", "KAS 1", "HIST 1", "PI 10", "ETHICS 1", "COMM 10"].includes(c.code)
      ).length >= 2
    ) {
      return false; // too many GE courses already
    }

    // Based on course planning practices of students
    if (course.code.includes("ENSC") && term.some(c => c.code.includes("ENSC"))) return false;

    if (course.code.includes("IE 14") && term.some(c => c.code.includes("IE 14"))) return false;
    if (course.code.startsWith("IE")) {
      const ieUnitsInTerm = term.reduce((sum, c) => {
        if (c.code.startsWith("IE") && Number.isFinite(c.units)) {
          return sum + c.units;
        }
        return sum;
      }, 0);

      const thisUnits = Number.isFinite(course.units) ? course.units : 0;

      if (ieUnitsInTerm + thisUnits > 13) return false;
    }

    return true;
  }

  function activateIE198Midyr() {
    const ie198 = courses.find(c => c.code === "IE 198");
    if (!ie198 || placed.has("IE 198")) return;

    // Find when all prerequisites of IE 198 are done
    for (let i = 0; i < terms.length; i++) {
      const prereqSatisfied = ie198.prerequisite.every(code => placed.has(code));
      if (prereqSatisfied) {
        const midyrIndex = i + 1;
        if (termNames[midyrIndex % 3] === "MIDYR") {
          midyrsActivated.add(midyrIndex);
          terms[midyrIndex] = [ie198];
          termUnits[midyrIndex] = ie198.units;
          placed.add("IE 198");
          break;
        }
      }
    }
  }

  let attempts = 0;
  while (courses.length >= 0 && attempts < 100) {
    const unplaced = courses
      .filter(c => !placed.has(c.code))
      .sort((a, b) => {
        // Prioritize by: critical Yes > No
        if (a.critical === "Yes" && b.critical !== "Yes") return -1;
        if (a.critical !== "Yes" && b.critical === "Yes") return 1;

        // Then by higher cruciality value
        return (b.cruciality || 0) - (a.cruciality || 0);
    });

    for (let course of unplaced) {
      let placedFlag = false;

      for (let t = 0; t < terms.length; t++) {
        if (placed.has(course.code)) break;

        const max = termCapacity[(t + offset) % 3];
        const percDiffLimit = termDifficultyCapacity[(t + offset) % 3];
        const u = typeof course.units === 'number' ? course.units : 0;

        if (termUnits[t] + u > max) continue;

        // ➕ NEW: check perc_diff limit
        let termPercDiffSum = 0, termPercDiffCount = 0;
        terms[t].forEach(c => {
          if (Number.isFinite(c.perc_diff)) {
            termPercDiffSum += c.perc_diff;
            termPercDiffCount++;
          }
        });
        if (Number.isFinite(course.perc_diff)) {
          termPercDiffSum += course.perc_diff;
          termPercDiffCount++;
        }
        const newAvgPercDiff = termPercDiffCount > 0 ? termPercDiffSum / termPercDiffCount : 0;

        if (newAvgPercDiff > percDiffLimit + 0.5) continue;

        if (canPlace(course, t)) {
          terms[t].push(course);
          termUnits[t] += u;
          placed.add(course.code);
          placedFlag = true;
          break;
        }
      }

      if (!placedFlag) {
        terms.push([]);
        termUnits.push(0);
      }
    }

    // Try to activate IE 198 midyr once prerequisites are done
    if (!placed.has("IE 198")) activateIE198Midyr();

    attempts++;

    // Re-run placement for remaining courses
    const remaining = courses
      .filter(c => !placed.has(c.code))
      .sort((a, b) => {
        if (a.critical === "Yes" && b.critical !== "Yes") return -1;
        if (a.critical !== "Yes" && b.critical === "Yes") return 1;
        return (b.cruciality || 0) - (a.cruciality || 0);
    });

    remaining.forEach(course => {
      for (let t = 0; t < terms.length; t++) {
        if (t === 5 && course.code !== "IE 198") continue;

        const max = termCapacity[(t + offset) % 3];
        const percDiffLimit = termDifficultyCapacity[(t + offset) % 3];
        const u = typeof course.units === 'number' ? course.units : 0;

        if (termUnits[t] + u > max) continue;

        // ➕ NEW: check perc_diff limit
        let termPercDiffSum = 0, termPercDiffCount = 0;
        terms[t].forEach(c => {
          if (Number.isFinite(c.perc_diff)) {
            termPercDiffSum += c.perc_diff;
            termPercDiffCount++;
          }
        });
        if (Number.isFinite(course.perc_diff)) {
          termPercDiffSum += course.perc_diff;
          termPercDiffCount++;
        }
        const newAvgPercDiff = termPercDiffCount > 0 ? termPercDiffSum / termPercDiffCount : 0;

        if (newAvgPercDiff > percDiffLimit + 0.5) continue;

        if (canPlace(course, t)) {
          terms[t].push(course);
          termUnits[t] += u;
          placed.add(course.code);
          break;
        }
      }
    });

    const allCourseCodes = new Set(courses.map(c => c.code));
    const unplacedCourses = [...allCourseCodes].filter(code => !placed.has(code));

    // Format as comma separated or line breaks
    const unplacedText = unplacedCourses.length > 0
      ? unplacedCourses.join(', ')
      : 'All courses placed successfully!';

    // Show in the element
    const unplacedElem = document.getElementById('courseUnplaced');
    if (unplacedElem) {
      unplacedElem.textContent = `Unplaced Courses: ${unplacedText}`;
    }

  }

  // Validate unit bounds
  for (let i = 0; i < terms.length; i++) {
    const type = termNames[i % 3];
    const total = termUnits[i];
    if (total === 0) continue;

    const min = termMinimums[(i + offset) % 3];
    const max = termCapacity[(i + offset) % 3];

    if (total < min || total > max) {
      console.warn(`⚠️ Warning: ${getTermLabel(i)} has ${total} units (must be ${min}–${max}).`);
    }
  }

  return terms.map((courses, i) => {
    const totalUnits = termUnits[i];

    // Calculate predicted GPA and avg perc_diff for this term
    let termPredGradePoints = 0;
    let termUnitsForPredGPA = 0;
    let termPercDiffSum = 0;
    let termPercDiffCount = 0;

    courses.forEach(course => {
      if (Number.isFinite(course.pred_grade) && Number.isFinite(course.units)) {
        termPredGradePoints += course.pred_grade * course.units;
        termUnitsForPredGPA += course.units;
      }

      if (Number.isFinite(course.perc_diff)) {
        termPercDiffSum += course.perc_diff;
        termPercDiffCount++;
      }
    });

    const termPredGPA = termUnitsForPredGPA > 0
      ? (termPredGradePoints / termUnitsForPredGPA).toFixed(2)
      : '';

    const termAvgPercDiff = termPercDiffCount > 0
      ? (termPercDiffSum / termPercDiffCount).toFixed(2)
      : '';

    return {
      label: getTermLabel(i),
      totalUnits,
      courses,
      predGPA: termPredGPA,
      avgPercDiff: termAvgPercDiff
    };
  });
}
  
async function displaySchedule(schedule) {
  const coursePlanContainer = document.getElementById('coursePlan');
  coursePlanContainer.innerHTML = '';

  const container = document.getElementById('notCompleted');
  container.innerHTML = '';

  const coursePlanData = JSON.parse(localStorage.getItem('coursePlanData') || '{}');
  const coursePlan = JSON.parse(localStorage.getItem('coursePlan') || '[]'); // from local storage

  const cognate1 = coursePlanData.cognate1;
  const cognate2 = coursePlanData.cognate2;
  const ge1 = coursePlanData.ge1;
  const ge2 = coursePlanData.ge2;
  const ge3 = coursePlanData.ge3;
  const ie200 = coursePlanData.ie200;

  function createCoursePill(courseCode) {
    const pill = document.createElement('div');
    pill.className = `course-pill gray`;
    pill.textContent = courseCode;
    return pill;
  }

  function createTermColumn(term) {
    if (!term.courses || term.courses.length === 0) return null;

    const column = document.createElement('div');
    column.className = 'term-column';

    const header = document.createElement('div');
    header.className = 'term-header';
    header.textContent = term.label;
    column.appendChild(header);

    term.courses.forEach(course => {
      let displayCode = course.code;
      if (course.code === 'Cognate (1)') displayCode = cognate1;
      if (course.code === 'Cognate (2)') displayCode = cognate2;
      if (course.code === 'GE Elective (1)') displayCode = ge1;
      if (course.code === 'GE Elective (2)') displayCode = ge2;
      if (course.code === 'GE Elective (3)') displayCode = ge3;
      if (course.code === 'IE 200/B/C (1)' || course.code === 'IE 200/B/C (2)') displayCode = ie200;

      column.appendChild(createCoursePill(displayCode));
    });

    const footer = document.createElement('div');
    footer.className = 'term-footer';
    footer.innerHTML = `
      <div>${term.totalUnits || 0} units</div>
      <div>Pred. GPA: ${term.predGPA || '-'}</div>
      <div>Difficulty: ${term.avgPercDiff || '-'}</div>
    `;
    column.appendChild(footer);

    return column;
  }

  // If coursePlan exists and is not empty, treat it as term 0
  if (coursePlan.length > 0) {
    // Compute total units
    const totalUnits = coursePlan.reduce((sum, course) => {
        return sum + (!isNaN(course.units) ? Number(course.units) : 0);
    }, 0);

    // Compute predicted GPA (weighted by units)
    const predGPA = (() => {
      let totalGradePoints = 0;
      let totalUnitsForGPA = 0;

      coursePlan.forEach(course => {
        const units = Number(course.units);
        const grade = Number(course.predictedgrade);

        if (!isNaN(units) && !isNaN(grade)) {
          totalGradePoints += grade * units;
          totalUnitsForGPA += units;
        }
      });

      return totalUnitsForGPA > 0 ? (totalGradePoints / totalUnitsForGPA) : 0;
    })();

    // Compute average difficulty (converted to numbers)
    const difficultyMap = {
      "Very Easy": 1,
      "Easy": 2,
      "Somewhat Easy": 3,
      "Moderate": 4,
      "Somewhat Difficult": 5,
      "Difficult": 6,
      "Very Difficult": 7
    };

    const avgPercDiff = (() => {
      let totalDifficulty = 0;
      let count = 0;

      coursePlan.forEach(course => {
        const diffValue = difficultyMap[course.difficulty];
        if (diffValue) {
          totalDifficulty += diffValue;
          count++;
        }
      });

      return count > 0 ? (totalDifficulty / count) : 0;
    })();

    const studentHistory = window.studentCourseHistory;
    
    const sortedTerms = studentHistory
    .map(term => term.term)
    .filter(t => t.includes("AY"))
    .sort(); // this works because "AY 23-24 2ND SEM" < "AY 24-25 1ST SEM"

    const lastTerm = sortedTerms[sortedTerms.length - 1]; // e.g., "AY 24-25 1ST SEM"

    // Extract base AY
    const ayMatch = lastTerm.match(/AY (\d{2})-(\d{2}) (1ST SEM|2ND SEM|MIDYR)/);
    if (!ayMatch) return "Unknown AY";

    let startYear = parseInt(ayMatch[1]);
    let endYear = parseInt(ayMatch[2]);
    
    let prevTerm = ayMatch[3];
    let nextTerm;

    if (prevTerm === "1ST SEM") {
      nextTerm = "2ND SEM";
      startYear += 0;
      endYear += 0;
    } else if (prevTerm === "2ND SEM" || prevTerm === "MIDYR") {
      nextTerm = "1ST SEM";
      startYear += 1;
      endYear += 1;
    }

    const planTerm = {
      label: `AY ${startYear}-${endYear} ${nextTerm}`,
      courses: coursePlan,
      totalUnits: totalUnits,
      predGPA: predGPA.toFixed(2),
      avgPercDiff: avgPercDiff.toFixed(2)
    };

    const planColumn = createTermColumn(planTerm);
    if (planColumn) coursePlanContainer.appendChild(planColumn);

    // Then display the rest of the schedule
    schedule.forEach(term => {
      const termColumn = createTermColumn(term);
      if (termColumn) container.appendChild(termColumn);
    });
  } else {
    // Original behavior
    schedule.forEach((term, i) => {
      const termColumn = createTermColumn(term);
      if (termColumn) {
        if (i === 0) {
          coursePlanContainer.appendChild(termColumn);
        } else {
          container.appendChild(termColumn);
        }
      }
    });
  }
}

async function getLongTermPlan() {
  const res = await fetch("../student/data/courses.json");
  const data = await res.json();

  // Flatten categorized course JSON
  const flatCourses = {};
  Object.values(data).forEach(category => {
      category.forEach(course => {
          flatCourses[course.code] = course; // key = code
      });
  });

  const sections = ["#completed", "#coursePlan", "#notCompleted"];
  let allTerms = [];

  sections.forEach(selector => {
    const container = document.querySelector(selector);
    if (!container) return;

    const termColumns = container.querySelectorAll(".term-column");

    termColumns.forEach(termColumn => {
      const termHeader = termColumn.querySelector(".term-header");
      const termName = termHeader ? termHeader.textContent.trim() : "";

      const courses = Array.from(termColumn.querySelectorAll(".course-pill")).map(pill => {
        return { code: pill.textContent.trim() };
      });

      // Compute total units from course.json data
      let totalUnits = courses.reduce((sum, course) => {
        const courseInfo = flatCourses[course.code];
        if (courseInfo && !isNaN(parseFloat(courseInfo.units))) {
            return sum + parseFloat(courseInfo.units);
        }
        return sum;
      }, 0);

      allTerms.push({
        term: termName,
        courses: courses,
        totalUnits: totalUnits
      });
    });
  });

  return allTerms;
}

async function previewSPMF() {
  const button = document.getElementById("preview-spmf-button");

  if (button) {
    button.addEventListener("click", () => {
      const overlay = document.getElementById("spmfPreviewOverlay");
      const iframe = document.getElementById("previewIframe");
  
      if (overlay && iframe) {
        overlay.classList.remove("hidden");
        iframe.src = "downloadable-spmf.html";
      }
    });
  }
  
  // Listen to message from iframe
  window.addEventListener('message', (event) => {
    if (event.data === 'closeOverlay') {
      overlay.classList.add("hidden");
      iframe.src = "";
    }
  });

  const { completedTerms, fulfilledPlaceholders } = await getCompletedCourses(false);

  const completedSet = new Set(
    completedTerms.flatMap(term =>
      term.courses
        .filter(c => !(c.grade === 5 || c.grade === 4 || c.grade === 'DRP' || c.grade === 'U' || c.grade === 'INC'))
        .map(c => c.code)
    )
  )
  
  Object.entries(fulfilledPlaceholders).forEach(([placeholder, actualCode]) => {
    if (completedSet.has(actualCode)) {
      // Check if placeholder has a suffix like "(1)"
      const match = placeholder.match(/\(\d+\)$/);
      if (match) {
        // Add the suffix to the actualCode
        completedSet.add(`${actualCode} ${match[0]}`);
      } else {
        // Otherwise just add the placeholder as-is
        completedSet.add(placeholder);
      }
    }
  });
  
  const iframe = document.getElementById("previewIframe");

  iframe.addEventListener("load", () => {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    completedSet.forEach(courseCode => {
      const courseDiv = iframeDoc.getElementById(`${courseCode}`);
      if (courseDiv) {
        courseDiv.classList.add("course-pill", "green");
      }
    });
  });
}