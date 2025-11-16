function isNowInTimePeriods(timePeriods) 
{
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
  
    return timePeriods.some(period => {
      const [startMinutes, endMinutes] = [period.startTime, period.endTime].map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      });
  
      return startMinutes < endMinutes
        ? currentTimeInMinutes >= startMinutes && currentTimeInMinutes <= endMinutes
        : currentTimeInMinutes >= startMinutes || currentTimeInMinutes <= endMinutes;
    });
}

function checkRulesStatus() {
    chrome.storage.local.get(['schedules'], ({ schedules = [] }) => {
        const statusElement = document.getElementById('rulesStatus');
        if (isNowInTimePeriods(schedules))
        {
            statusElement.textContent = 'Rules status: ON'
            statusElement.style.color = 'green'
        } else {
            // Rules are OFF
            statusElement.textContent = 'Rules status: OFF'
            statusElement.style.color = 'red'
        }
    })
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
            const allowEdit = document.documentElement.dataset.page == 'edit';
            if (allowEdit) {
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'Remove';
                removeBtn.onclick = function() { removeSchedule(index); };
                scheduleItem.appendChild(removeBtn);
            }
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
        });
    });
}

function removeSchedule(indexToRemove) {
    chrome.storage.local.get(['schedules'], function(result) {
        const schedules = result.schedules || [];
        schedules.splice(indexToRemove, 1); // Remove schedule at index
        chrome.storage.local.set({schedules}, function() {
            refreshScheduleList();
        });
    });
}

function updateSiteList(storage_item, elementID)
{
    chrome.storage.local.get([storage_item], function(result) {
        const sitesList = document.getElementById(elementID);
        sitesList.innerHTML = ''; // Clear the list
        (result[storage_item] || []).forEach(site => {
            const siteItem = document.createElement('div');
            siteItem.className = 'site-item ' + storage_item;
            siteItem.textContent = site;
            const allowEdit = document.documentElement.dataset.page == 'edit';
            if (allowEdit) {
                const removeButton = document.createElement('button');
                removeButton.textContent = 'Remove';
                removeButton.onclick = function() { removeSite(storage_item, site); };
                siteItem.appendChild(removeButton);
            }
            sitesList.appendChild(siteItem);
        });
    })
}

// Function to refresh the list sites in the popup
function refreshSiteLists() {
    updateSiteList('blockedSites', 'badSitesList')
    updateSiteList('allowedSites', 'goodSitesList')
}

// Function to remove a site from the list
function removeSite(storage_item, siteToRemove) {
    chrome.storage.local.get([storage_item], function(result) {
        const updatedSites = (result[storage_item] || []).filter(site => site !== siteToRemove);
        let new_dict = {}
        new_dict[storage_item] = updatedSites
        chrome.storage.local.set(new_dict, function() {
            console.log(`${siteToRemove} removed from ${storage_item} list.`);
            refreshSiteLists(); // Refresh the UI list
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const addBadSiteButton = document.getElementById('addBadSite');
    const addGoodSiteButton = document.getElementById('addGoodSite');
    const siteInput = document.getElementById('siteInput');

    refreshSiteLists();
    refreshScheduleList();

    // Function to add a site to the block/allow list in local storage
    function addSite(site, listName) {
        chrome.storage.local.get([listName], function(result) {
            const sites = new Set(result[listName] || []);
            sites.add(site);
            let tmp = {}
            tmp[listName] = Array.from(sites)
            chrome.storage.local.set(tmp, function() {
                console.log(`${site} was added to ${listName}`);
				refreshSiteLists();
            });
        });
    }

    const allowEdit = document.documentElement.dataset.page == 'edit';
    if (allowEdit) {
        addBadSiteButton.addEventListener('click', function() {
            const site = siteInput.value.trim();
            if (site) {
                addSite(site, 'blockedSites');
                siteInput.value = ''; // Clear input after adding
            }
        });
    
        addGoodSiteButton.addEventListener('click', function() {
            const site = siteInput.value.trim();
            if (site) {
                addSite(site, 'allowedSites');
                siteInput.value = ''; // Clear input after adding
            }
        });

        document.getElementById('addSchedule').addEventListener('click', addSchedule);	
    }
});

