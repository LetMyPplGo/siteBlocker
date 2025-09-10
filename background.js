// set one alarm to run every minute
// set alarm handler to run tabs check if time is in scheduled
// in tabs check iterate tabs and compare url with lists
const alarm_name = 'tabsChecker'

// Function to clear all existing alarms and set new one
function updateAlarm() {
    chrome.alarms.clear(alarm_name, () => {
        chrome.alarms.create(alarm_name, {periodInMinutes: 1, when: Date.now()})
		console.log('Alarm is updated')
    });
}

function matchesPattern(pattern, str) {
    let regexPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*');
    let regex = new RegExp('^' + regexPattern + '$');
    return regex.test(str);
}

function handleTab(tab) {
    chrome.storage.local.get(['allowedSites', 'blockedSites'], function(result) {
        let allowedSites = result.allowedSites || []
        let blockedSites = result.blockedSites || []
        allowedSites.push('chrome-extension://*')
        allowedSites.push('chrome://*')
        allowedSites.push('about:blank')
        try {
            for (site of allowedSites) {
                if (matchesPattern(site, tab.url)) 
                {
                    console.log(`This tab is allowed: ${tab.url}`)
                    return
                }
            }
            for (site of blockedSites) {
                if (matchesPattern(site, tab.url)) {
                    console.log(`Blocking the tab with url ${tab.url}`)
                    // chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") })
                    chrome.tabs.get(tab.id, (tabInfo) => {
                        chrome.tabs.remove(tab.id, () => {
                            chrome.tabs.create({
                                url: chrome.runtime.getURL("blocked.html"),
                                index: tabInfo.index,
                                active: tabInfo.active
                            });
                        });
                    });
                    break
                }
            }
        } catch(err)
        {
            console.log(`Error handling tab ${tab.id}. \n${err.message}`)
        }
    })
}

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

function checkTabs()
{
    chrome.storage.local.get(['schedules'], ({ schedules = [] }) => {
        if (isNowInTimePeriods(schedules))
        {
            console.log("Time to check the tabs")
			chrome.tabs.query({}, (tabs) => {
				for (const tab of tabs)
                {
                    handleTab(tab)
                }
			})

        }
    })
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === alarm_name) {
        checkTabs()
    }
});

chrome.idle.onStateChanged.addListener((newState) => {
	if (newState === 'active') 
	{
		updateAlarm()
	}
});

// Service Worker event handler to wait for the promises to settle
self.addEventListener('fetch', event => {
    // Check if the preloadResponse is being used
    if (event.preloadResponse) {
        event.respondWith(
            event.preloadResponse.then(response => {
                if (response) {
                    return response;
                } else {
                    return fetch(event.request);
                }
            }).catch(() => {
                return fetch(event.request);
            })
        );
    }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({url: 'popup.html'});
});

updateAlarm()
