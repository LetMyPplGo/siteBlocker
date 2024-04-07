function checkRulesStatus() {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
        const statusElement = document.getElementById('rulesStatus');
        if (rules && rules.length > 0) {
            // Rules are ON
            statusElement.textContent = 'Rules status: ON';
            statusElement.style.color = 'green';
        } else {
            // Rules are OFF
            statusElement.textContent = 'Rules status: OFF';
            statusElement.style.color = 'red';
        }
    });
}

// Call the function immediately to check the status as soon as the popup opens
checkRulesStatus();

// Then set an interval to check the status every 5 seconds
setInterval(checkRulesStatus, 5000);

// --------------------------------------------------------------------------------------------

function refreshScheduleList() {
    const scheduleList = document.getElementById('scheduleList');
    chrome.storage.local.get(['schedules'], function(result) {
        const schedules = result.schedules || [];
        scheduleList.innerHTML = ''; // Clear current list
        schedules.forEach((schedule, index) => {
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
			scheduleItem.textContent = `${schedule.startTime} - ${schedule.endTime}`;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.onclick = function() { removeSchedule(index); };
            scheduleItem.appendChild(removeBtn);
            scheduleList.appendChild(scheduleItem);
        });
    });
}

function addSchedule() {
    const newStartTime = document.getElementById('newStartTime').value;
    const newEndTime = document.getElementById('newEndTime').value;
    if (!newStartTime || !newEndTime) {
        alert("Please fill in both start and end times.");
        return;
    }
    chrome.storage.local.get(['schedules'], function(result) {
        const schedules = result.schedules || [];
        schedules.push({ startTime: newStartTime, endTime: newEndTime });
        chrome.storage.local.set({schedules}, function() {
            refreshScheduleList();
            // Notify background to update rules
            chrome.runtime.sendMessage({command: "updateSchedules", schedules: schedules});
        });
    });
}

function removeSchedule(indexToRemove) {
    chrome.storage.local.get(['schedules'], function(result) {
        const schedules = result.schedules || [];
        schedules.splice(indexToRemove, 1); // Remove schedule at index
        chrome.storage.local.set({schedules}, function() {
            refreshScheduleList();
            // Notify background to update rules
            chrome.runtime.sendMessage({command: "updateSchedules", schedules: schedules});
        });
    });
}


// Function to refresh the list of blocked sites in the popup
function refreshBlockedSitesList() {
    chrome.storage.local.get(['blockedSites'], function(result) {
        const sitesList = document.getElementById('sitesList');
        sitesList.innerHTML = ''; // Clear the list

        (result.blockedSites || []).forEach(site => {
            const siteItem = document.createElement('div');
            const removeButton = document.createElement('button');
			siteItem.className = 'site-item';
            siteItem.textContent = site;
            removeButton.textContent = 'Remove';
            removeButton.onclick = function() { removeSite(site); };

            siteItem.appendChild(removeButton);
            sitesList.appendChild(siteItem);
        });
    });
}

// Function to remove a site from the block list
function removeSite(siteToRemove) {
    chrome.storage.local.get(['blockedSites'], function(result) {
        const updatedBlockedSites = (result.blockedSites || []).filter(site => site !== siteToRemove);
        chrome.storage.local.set({blockedSites: updatedBlockedSites}, function() {
            console.log(`${siteToRemove} removed from block list.`);
            // Notify background.js to update the rules
            chrome.runtime.sendMessage({command: "updateRules"});
            refreshBlockedSitesList(); // Refresh the UI list
        });
    });
}


document.addEventListener('DOMContentLoaded', function() {
    const addSiteButton = document.getElementById('addSite');
    const siteInput = document.getElementById('siteInput');

    refreshBlockedSitesList();
    refreshScheduleList();

    // Function to add a site to the block list in local storage
    function addSite(site) {
        chrome.storage.local.get(['blockedSites'], function(result) {
            const blockedSites = new Set(result.blockedSites || []);
            blockedSites.add(site);
            chrome.storage.local.set({blockedSites: Array.from(blockedSites)}, function() {
                console.log(site + ' was added to block list');
				refreshBlockedSitesList();
                // Notify background.js to update the rules
                chrome.runtime.sendMessage({command: "updateRules"});
            });
        });
		
    }

    addSiteButton.addEventListener('click', function() {
        const site = siteInput.value.trim();
        if (site) {
            addSite(site);
            siteInput.value = ''; // Clear input after adding
        }
    });

    document.getElementById('addSchedule').addEventListener('click', addSchedule);
	
	document.getElementById('toggleActive').addEventListener('change', function() {
		const isEnabled = this.checked;
		chrome.storage.local.set({ isEnabled }, function() {
			chrome.runtime.sendMessage({ command: "togglePlugin", isEnabled });
		});
	});
	
});

