function calculateTimeToAlarm(timeString) {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    const now = new Date();
    let targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // If the target time has already passed today, set it for the next day
    if (targetTime < now) {
        targetTime.setDate(targetTime.getDate() + 1);
    }

    return targetTime.getTime(); // Return the epoch milliseconds of the target time
}

// Function to clear all existing alarms and set new ones based on updated schedules
function updateAlarmsForSchedules(schedules) {
    // Clear all existing alarms first
    chrome.alarms.clearAll(() => {
        schedules.forEach((schedule, index) => {
            // Set start alarm for each schedule
            chrome.alarms.create(`startBlocking_${schedule.id}`, {
                when: calculateTimeToAlarm(schedule.startTime),
                periodInMinutes: 1440 // Daily repetition
            });
            // Set stop alarm for each schedule
            chrome.alarms.create(`stopBlocking_${schedule.id}`, {
                when: calculateTimeToAlarm(schedule.endTime),
                periodInMinutes: 1440 // Daily repetition
            });
        });
		console.log('Schedule alarms updated.')
    });
}

function enableBlocking() {
	removeAllDynamicRules();
    let rules

    chrome.storage.local.get(['blockedSites'], function(result) {
        const blockedSites = result.blockedSites || [];
        rules = blockedSites.map((site, index) => ({
            id: index + 1,
            priority: 1,
            action: { type: "redirect", redirect: { "extensionPath": "/blocked.html" } },
			condition: { urlFilter: site, resourceTypes: ['main_frame'] }
        }));
		
        // Update dynamic rules
        chrome.declarativeNetRequest.updateDynamicRules({addRules: rules}, () => {
			// TODO: only youtube is reloaded now. replace with urls from the list
			chrome.tabs.query({url: '*://*.youtube.com/*'}, function(tabs) {
				chrome.storage.local.set({closedTabs: tabs});
				tabs.forEach(tab => {
					console.log('Reloading the tab: ' + tab.url);
					chrome.tabs.reload(tab.id);
				});
			});
		});
    });
    
    // DBG
    // console.log(rules.length)

    chrome.storage.local.get(['allowedSites'], function(result) {
        const allowedSites = result.allowedSites || [];
        allowedSites.push('chrome-extension://*')
        allowedSites.push('chrome://*')
        rules = allowedSites.map((site, index) => ({
            id: index + 101,
            priority: 1,
            action: { type: "allow"},
			condition: { urlFilter: site, resourceTypes: ['main_frame'] }
        }));
		
        // Update dynamic rules
        chrome.declarativeNetRequest.updateDynamicRules({addRules: rules})
    });
}

// Function to fetch and remove all existing dynamic rules
function removeAllDynamicRules() {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
        const ruleIds = rules.map(rule => rule.id);
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIds
        }, () => {
			chrome.storage.local.get(['closedTabs'], function(result) {
				(result.closedTabs || []).forEach(tab => {
					console.log('Restoring the tab: ' + tab.url);
					chrome.tabs.update(tab.id, { url: tab.url });
				});
			});
		});
    });
	
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "updateSchedules") {
        updateAlarmsForSchedules(message.schedules);
        sendResponse({result: "Schedules updated"});
    }
    if (message.command === "updateRules") {
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
			if (rules.length > 0) {enableBlocking()}
		});
    }
    if (message.command === "togglePlugin") {
        if (message.isEnabled) {
            console.log("Force enabling rules");
            enableBlocking();
        } else {
            console.log("Force disabling rules");
            removeAllDynamicRules();
        }
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    const [action, scheduleId] = alarm.name.split('_');
    if (action === "startBlocking") {
        console.log('Time to add blocking rules')
		enableBlocking();
    } else if (action === "stopBlocking") {
        console.log('Time to remove blocking rules')
        removeAllDynamicRules();
    }
});

chrome.idle.onStateChanged.addListener((newState) => {
	if (newState === 'active') 
	{
		chrome.storage.local.get(['schedules'], ({ schedules = [] }) => {
			const now = new Date();
			const currentMinutes = now.getHours() * 60 + now.getMinutes();

			const isWithinSchedule = schedules.some(({ startTime, endTime }) => {
				const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
				const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
				return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
			});

			if (isWithinSchedule)
			{
				console.log("Enabling rules after wake up");
				enableBlocking();
			} else {
				console.log("Disabling rules after wake up");
				removeAllDynamicRules();
			}
		});
	}
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({url: 'popup.html'});
});
