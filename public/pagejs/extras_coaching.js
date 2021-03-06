var currentLessonRef;
var currentLessonProgress;

function displayCoachingData(user) {
    // show all the coaching data now, first hide the warning that you are not a coach
    document.getElementById('not_logged_in').style.display = 'none';
    document.getElementById('not_a_coach').style.display = 'none';
                
    // now get all the lessons and show them all here
    var lessonsDiv = document.getElementById('lessons');
    // populate this div with the lessons from firebase
    firebaseData.getLessonPlan('coaching',
        function(doc) {
            // have the plan
            if (doc.exists) {
                // do stuff with the data
                displayLessonPlan(lessonsDiv, doc.data());   
            } else {
                // error
                lessonsDiv.innerHTML = 'failed to find the lesson plan, sorry...';
            }
            // show the result
            lessonsDiv.style.display = null;
        },
        function(error) {
            console.log("Error getting the coaching lesson plan:", error);
        });
}

function hideCoachingData(user) {
    // hide all the coaching data
    document.getElementById('lessons').style.display = 'none';
    if (user) {
        // have a user, but not a coach, tell them to upgrade
        document.getElementById('not_logged_in').style.display = 'none';
        document.getElementById('not_a_coach').style.display = null;
    }
    else {
        // we are not logged in, ask the user to log in
        document.getElementById('not_logged_in').style.display = null;
        document.getElementById('not_a_coach').style.display = 'none';
    }
    // remove everything from the lesson plan div
    var lessonsDiv = document.getElementById('lessons');
    var child = lessonsDiv.lastElementChild;  
    while (child) { 
        lessonsDiv.removeChild(child); 
        child = lessonsDiv.lastElementChild; 
    }
}

function displayLessonPlan(lessonsDiv, data) {
    // remove everything from the div
    var child = lessonsDiv.lastElementChild;  
    while (child) { 
        lessonsDiv.removeChild(child); 
        child = lessonsDiv.lastElementChild; 
    }
    // find the templates to use
    var templateLessonContainer = document.getElementById('template-lesson-container');

    // and put the lessons back in
    var lessonRefs = data['lessons'];
    var lessonNames = data['lessons_names'];
    for (var i = 0; i < lessonRefs.length; ++i) {
        var lessonRef = lessonRefs[i].id;
        var lessonName = "Lesson " + (i + 1);
        if (i < lessonNames.length) {
            lessonName = lessonNames[i];
        }
        // create the button container - all included
        var lessonContainer = templateLessonContainer.cloneNode(true);
        // without the ID (won't be unique)
        lessonContainer.id = lessonRef + 'container';
        // and put this container into the document and remember the one added
        lessonContainer = lessonsDiv.appendChild(lessonContainer);
        
        // this container contains the button, find the button
        var lessonButton = lessonContainer.querySelector('#template-lesson-button');
        // and set the ID and the name properly
        lessonButton.id = lessonRef;
        lessonButton.innerHTML = lessonName;
        lessonButton.setAttribute("onClick", "onClickLesson('" + lessonRef + "')");
        // reveal the whole container
        lessonContainer.style.display = null;
    }

    // get the last lesson the user accessed and select this if we can
    var user = firebaseData.getUser();
    if (user) {
        // there is a user, get the data
        firebaseData.getUserData(user, 
            function(userData) {
                if (userData) {
                    // update all the progress on the buttons we are showing
                    updateLessonProgressButtons(userData);
                    var lessonRef = userData['last_coaching_lesson'];
                    if (lessonRef) {
                        // have one, select this button
                        showLessonContent(lessonRef, userData);
                    }
                }
            },
            function (error) {
                // failed to get the data, this is ok - it will just not have one selected
                console.log("there is no last lesson to select by default", error);
            });
    }
}

function setLessonProgress(progress) {
    // set the progress of this lesson
    showLessonProgress(progress);
    // set the progress of the currently active lesson to the specified progress
    if (currentLessonRef) {
        var user = firebaseData.getUser();
        if (user) {
            // there is a user, this is the document we want to change, create the update to send
            var usersUpdate = {};
            usersUpdate['progress_' + currentLessonRef] = progress;
            usersUpdate['last_coaching_lesson'] = currentLessonRef;
            // and send this update
            firebaseData.updateUserData(user, usersUpdate, 
                function() {
                    // this worked
                    updateLessonProgressButton(currentLessonRef, progress);
                },
                function(error) {
                    // this failed
                    console.error("Error updating lesson progress: ", error);
                });
        }
    }
    else {
        // no current lesson to set
        console.log("no lesson selected to set")
    }
}

function updateLessonProgressButtons(userData) {
    var keyNames = Object.keys(userData);
    for (var i = 0; i < keyNames.length; ++i) {
        // for every member in the user data, find the progresses recorded
        if (keyNames[i].startsWith('progress_')) {
            // this is the progress of something, get this button
            updateLessonProgressButton(keyNames[i].split('_')[1], userData[keyNames[i]]);
        }
    }
}

function updateLessonProgressButton(lessonId, progressNumber) {
    var lessonButton = document.getElementById(lessonId);
    if (lessonButton) {
        // clear any children (progress and line breaks) from the button
        var child = lessonButton.lastElementChild;  
        while (child) { 
            lessonButton.removeChild(child); 
            child = lessonButton.lastElementChild; 
        }
        // get the progress
        progressNumber = Number(progressNumber);
        if (!isNaN(progressNumber)) {
            // create a break
            lessonButton.appendChild(document.createElement('br'));
            // and the progress controls
            var progressCtrl = document.createElement('progress');
            progressCtrl.max = 1;
            progressCtrl.value = progressNumber;
            // and add to the button
            lessonButton.appendChild(progressCtrl);
            lessonButton.classList.add('progress_button');
            //+=  '<br><progress style="button_progress" max="1" value="0.85"></progress>';
        }
    }
}

function showLessonProgress(progress) {
    // find the button that represents this progress level and select it
    
    // remove the 'special' from any currently pressed buttons
    var buttons = document.getElementsByClassName("lesson_progress_selector");
    for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].id === 'lesson_progress_' + progress) {
            // this is the special one (it's id is the lesson_progress_1 or whatever the progress currently is)
            buttons[i].classList.add("special");
        }
        else {
            // this is not the clicked on
            buttons[i].classList.remove("special");
        }
    }

    var progressControl = document.getElementById('progress_display');
    if (progress) {
        progressControl.value = progress;
        progressControl.style.display = null;
    }
    else {
        progressControl.style.display = 'none';
    }
}

function onClickLesson(lessonRef) {
    // they clicked a button then, show the content
    // this needs the user data while we are here
    var user = firebaseData.getUser();
    if (user) {
        // there is a user, get the data
        firebaseData.getUserData(user, function(userData) {
            // we have the data, is there a last 'coaching_lesson' reference
            showLessonContent(lessonRef, userData);
        },
        function(error) {
            // failed to get the data, this is ok - it will just not have one selected
            console.log("Failed to get the user data: ", error);
            showLessonContent(lessonRef, null);
        });
    }
    else {
        // no user, doesn't mean we can't show the content
        showLessonContent(lessonRef, null);
    }
}

function showLessonContent(lessonRef, userData) {
    // remember this reference to the currently selected lesson
    currentLessonRef = lessonRef;
    currentLessonProgress = userData['progress_' + lessonRef];

    // remove the 'special' from any currently pressed buttons
    var buttons = document.getElementsByClassName("lesson_selector");
    for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].id === lessonRef) {
            // this is the special one
            buttons[i].classList.add("special");
        }
        else {
            // this is not the clicked on
            buttons[i].classList.remove("special");
        }
    }
    removeLessonContent();

    // populate the div with the lesson content from firebase
    firebaseData.getLesson('coaching_lessons', currentLessonRef, 
        function(doc) {
            if (doc.exists) {
                // show this lesson content
                displayLessonContent(lessonRef, doc.data());
            } else {
                // error
                removeLessonContent();
                document.getElementById('lesson_content').innerHTML = "Sorry, couldn't find a lesson for " + lessonRef;
            }
        },
        function(error) {
            removeLessonContent();
            console.log("Error getting lesson document:", error);
        });
}

function displayLessonContent(lessonRef, lessonData) {
    removeLessonContent()
    var lessonContent = document.getElementById('lesson_content');
    document.getElementById('lesson_name').innerHTML = lessonData['name'];
    document.getElementById('lesson_subtitle').innerHTML = lessonData['subtitle'];
    document.getElementById('lesson_content').style.display = null;

    var progressOptions = lessonData['progress_options'];
    if (progressOptions) {
        // get the template progress button
        var progressButtonTemplate = document.getElementById('template-lesson-progress');
        var progressContainer = lessonContent.querySelector('#lesson_progress_container');
        // remove all the progress buttons from the container to start clean
        var child = progressContainer.lastElementChild;  
        while (child) { 
            progressContainer.removeChild(child); 
            child = progressContainer.lastElementChild; 
        } 
        // there are options for progress to be recorded, get the options and create the buttons for them here
        var optionsArray = progressOptions.split(',');
        for (var i = 0; i < optionsArray.length; ++i) {
            // for each option, create the progress button
            var progressButtonParent = progressButtonTemplate.cloneNode(true);
            // get rid of the non-unique id
            progressButtonParent.id = null;
            var progressButton = progressButtonParent.querySelector('#lesson-progress-button');
            var settingsArray = optionsArray[i].split(':');
            progressButton.innerHTML = settingsArray[0];
            progressButton.id = 'lesson_progress_' + settingsArray[1];
            progressButton.setAttribute("onClick", "setLessonProgress('" + settingsArray[1] + "')");
            // add to the container
            progressContainer.appendChild(progressButtonParent);
        }

        // so we need to get all the contents under this lesson, and add a div of content for each of them
        firebaseData.getLessonSections(false, 'coaching_lessons', lessonRef,
            function(querySnapshot) {
                // we have all the lessons to show, so show them
                var contentsContainer = lessonContent.querySelector('#lesson_contents_container');
                var child = contentsContainer.lastElementChild;
                while (child) {
                    contentsContainer.removeChild(child);
                    child = contentsContainer.lastElementChild;
                }
                // and put each content found back in
                querySnapshot.forEach(function (doc) {
                    // doc.data() is never undefined for query doc snapshots
                    createLessonContentsDiv(contentsContainer, doc.id, doc.data());
                });
            },
            function(error) {
                console.log("Failed to get the coaching lessons: ", error);
            });
    }

    // show the current progress
    showLessonProgress(currentLessonProgress);
}

function resizeDocumentContent(source, idsToResize, targetSizeId, alternateButtonId) {
    var commonParent = source;
    var targetElement;
    do {
        // try to find the target under the common parent
        targetElement = commonParent.querySelector(targetSizeId);
        // keep looking up
        if (!targetElement) {
            commonParent = commonParent.parentElement;
        }
    } while (!targetElement && commonParent);

    var alternateButton = commonParent.querySelector(alternateButtonId);
    if (alternateButton) {
        // change buttons
        source.style.display = 'none';
        alternateButton.style.display = null;
    }
    
    var width = targetElement.offsetWidth;
    var idArray = idsToResize.split(',');
    for (var i = 0; i < idArray.length; ++i) {
        var elementToResize = commonParent.querySelector(idArray[i]);
        if (elementToResize) {
            var heightFactor = elementToResize.offsetHeight / elementToResize.offsetWidth
            if (!alternateButton && elementToResize.width == width) {
                // no alternative button and the element is already big, shrink it back
                elementToResize.removeAttribute('width');
                elementToResize.removeAttribute('height');
                // was it a fill container and wants to be again?
                if (elementToResize.classList.contains('iframe-fillContainer-removed')) {
                    // remove it
                    elementToResize.classList.remove('iframe-fillContainer-removed');
                    // and add the real one back in
                    elementToResize.classList.add('iframe-fillContainer');
                }
            }
            else {
                elementToResize.width = width;
                elementToResize.height = heightFactor * width;
                // but if it is an 'iframe-fillContainer' - the style of this will make it 100% all the time, remove this then!
                if (elementToResize.classList.contains('iframe-fillContainer')) {
                    // remove it
                    elementToResize.classList.remove('iframe-fillContainer');
                    // but add a dummy so reset knows to put it back in
                    elementToResize.classList.add('iframe-fillContainer-removed');
                }
            }
        }
    }
}

function resizeDocumentContentReset(source, idsToResize, targetSizeId, alternateButtonId) {
    var commonParent = source;
    var targetElement;
    do {
        // try to find the target under the common parent
        targetElement = commonParent.querySelector(targetSizeId);
        // keep looking up
        if (!targetElement) {
            commonParent = commonParent.parentElement;
        }
    } while (!targetElement && commonParent);

    var alternateButton = commonParent.querySelector(alternateButtonId);
    if (alternateButton) {
        // change buttons
        source.style.display = 'none';
        alternateButton.style.display = null;
    }
    
    var idArray = idsToResize.split(',');
    for (var i = 0; i < idArray.length; ++i) {
        var elementToResize = commonParent.querySelector(idArray[i]);
        if (elementToResize) {
            // reset the size
            elementToResize.removeAttribute('width');
            elementToResize.removeAttribute('height');
            // was it a fill container and wants to be again?
            if (elementToResize.classList.contains('iframe-fillContainer-removed')) {
                // remove it
                elementToResize.classList.remove('iframe-fillContainer-removed');
                // and add the real one back in
                elementToResize.classList.add('iframe-fillContainer');
            }
        }
    }
}

function createLessonContentsDiv(contentsContainer, contentsRef, contents) {
    // find the template and copy it to the contentsContainer before populating the relevant data
    var contentsDiv = document.getElementById('template-lesson-content').cloneNode(true);
    // reset the id - the id is for the template, not the pasted contents
    contentsDiv.id = contentsRef;
    // set all the dta on this cloned node
    var heading = contentsDiv.querySelector('#lesson_content_heading');
    var subtitle = contentsDiv.querySelector('#lesson_content_subtitle');
    var image, video, text;
    
    if (contents['image'] && contents['video']) {
        // show the three part data section
        contentsDiv.querySelector('#lesson_content_three').style.display = null;
        video = contentsDiv.querySelector('#lesson_content_video_three');
        image = contentsDiv.querySelector('#lesson_content_image_three');
        text = contentsDiv.querySelector('#lesson_content_three_of_three');
    }
    else {
        // show the two part data section
        contentsDiv.querySelector('#lesson_content_two').style.display = null;
        text = contentsDiv.querySelector('#lesson_content_two_of_two');
        if (contents['image']) {
            // show the image only
            image = contentsDiv.querySelector('#lesson_content_image_two');
        
        }
        else if (contents['video']) {
            // show the video only
            video = contentsDiv.querySelector('#lesson_content_video_two');
            // show the button to grow this
            contentsDiv.querySelector('#lesson_content_grow_video_two').style.display = null;
        }
        else {
            //oops - need one or the other! show text only - will show the logo with the text
            contentsDiv.querySelector('#lesson_content_image_two').style.display = null;
        }
    }

    // set the contents then
    if (heading) {
        heading.innerHTML = contents['title'];
    }
    if (subtitle) {
        subtitle.innerHTML = contents['subtitle'];
    }
    if (video) {
        video.src = contents['video'];
        video.style.display = null;
        video.parentElement.style.display = null;
    }
    if (image) {
        image.src = contents['image'];
        image.style.display = null;
    }
    if (text) {
        text.innerHTML = contents['text'];
    }

    // and append this div to the content
    contentsContainer.appendChild(contentsDiv);
}

function removeLessonContent() {
    document.getElementById('lesson_content').style.display = 'none';
}

// need to manage the data in this page
function populateUserData() {
    var user = firebaseData.getUser();
    if (user) {
        // we are logged in
        displayCoachingData(user);
        // get the user data from firebase here
        firebaseData.getUserData(user, 
            function(data) {
                // we have the user data here, set the data correctly
                if (firebaseData.isUserCoach(data)) {
                    // we are a coach
                    displayCoachingData(user);
                }
                else {
                    // we are not a coach, hide the data
                    hideCoachingData(user);
                }
            }, function(error) {
                // this is the failure to get the data, do our best I suppose
                hideCoachingData(user);
                console.log("Failed to get the firestore user data: ", error);
            });
    }
    else {
        // we are not logged in, ask the user to log in
        hideCoachingData(user);
    }
};

document.addEventListener('firebaseuserchange', function() {
    console.log('login changed so ready for input');
    populateUserData();			
});