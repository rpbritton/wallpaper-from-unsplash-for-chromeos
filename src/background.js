const defaultSettings = {
	'url': 'https://source.unsplash.com/random/1920x1080/',
	'interval': 60,
	'intervals': [1, 5, 15, 30, 60, 120, 360, 720, 1440]
};
chrome.storage.local.get(storage => {
	if (Object.keys(storage).length === 0) {
		chrome.storage.local.set(defaultSettings);
	}
});
/*
chrome.storage.sync.clear();
chrome.storage.local.clear();
//*/
function getWallpaper() {
	chrome.storage.local.get('url', settings => {
		chrome.wallpaper.setWallpaper({
			'url': settings.url,
			'layout': 'CENTER_CROPPED',
			'filename': 'wallpaper_from_unsplash'
		}, () => {console.log('New wallpaper fetched');});
	});
}

function formatInterval(totalMinutes) {
	let hours = Math.floor(totalMinutes/60);
	let minutes = totalMinutes-hours*60;

	let formatted = '';
	if (hours === 1)
		formatted += `${hours} hour`;
	if (hours > 1)
		formatted += `${hours} hours`;
	if (hours > 0 && minutes > 0)
		formatted += ' and '
	if (minutes === 1)
		formatted += `${minutes} minute`;
	if (minutes > 1)
		formatted += `${minutes} minutes`;
	
	return formatted;
}

function setInterval(newInterval) {
	chrome.storage.local.get('intervals', settings => {
		chrome.storage.local.set({'interval': newInterval});
		chrome.contextMenus.update('custom', {'title': 'Custom', 'checked': false});
		chrome.contextMenus.update('interval', {'title': `Change every: ${formatInterval(newInterval)}`});
		updateAlarm();
		let iterations = 0;
		let custom = true;
		for (let interval of settings.intervals) {
			if (interval === newInterval) {
				custom = false;
				chrome.contextMenus.update(`${interval}`, {'checked': true});
			}
			iterations++;
			if (iterations === settings.intervals.length && custom) {
				chrome.contextMenus.update('custom', {'title': `Custom: ${formatInterval(newInterval)}`, 'checked': true});
			}
		}
	});
}

function updateAlarm() {
	chrome.storage.local.get('interval', settings => {
		if (settings.interval !== 0) {
			chrome.alarms.create('get_wallpaper', {
				'periodInMinutes': settings.interval
			});
		}
	});
}

chrome.runtime.getPlatformInfo(platformInfo => {
	if (platformInfo.os == 'cros') {

		chrome.contextMenus.create({
			'title': 'Skip wallpaper',
			'contexts': ['page_action'],
			'id': 'refresh'
		});
		chrome.contextMenus.create({
			'title': 'Wallpaper url',
			'contexts': ['page_action'],
			'id': 'url'
		});
		chrome.storage.local.get(['interval', 'intervals'], settings => {
			chrome.contextMenus.create({
				'title': `Change every: ${formatInterval(settings.interval)}`,
				'contexts': ['page_action'],
				'id': 'interval'
			}, () => {
				let iterations = 0;
				for (let interval of settings.intervals) {
					//let checked = (interval === settings.interval);
					let customTitle = `Custom: ${formatInterval(settings.interval)}`;
					//if (checked)
					//	customTitle += `: ${formatInterval(interval)}`;
					chrome.contextMenus.create({
						'title': formatInterval(interval),
						'contexts': ['page_action'],
						'id': `${interval}`,
						'type': 'radio',
						'parentId': 'interval'//,
						//'checked': checked
					}, () => {
						iterations++;
						if (iterations === settings.intervals.length) {
							chrome.contextMenus.create({
								'title': 'Custom',//customTitle,
								'contexts': ['page_action'],
								'id': 'custom',
								'type': 'radio',
								'parentId': 'interval'//,
								//'checked': (customTitle !== 'Custom')
							});
							setInterval(settings.interval);
						}
					});
				}
			});
		});
		chrome.contextMenus.onClicked.addListener(contextMenu => {
			if (contextMenu.menuItemId == 'refresh')
				getWallpaper();
			if (contextMenu.menuItemId == 'url') {
				chrome.storage.local.get('url', settings => {
					let newUrl = prompt(`Enter the wallpaper url:\n(Default is "${defaultSettings.url}")`, settings.url);
					if (newUrl) {
						console.log('here!');
						let testImage = new Image();
						testImage.onload = () => {
							chrome.storage.local.set({'url': newUrl});
							getWallpaper();
						}
						testImage.onerror = () => {
							alert('Error: invalid image url');
							console.error('Error: invalid custom wallpaper url');
						}
						testImage.src = newUrl;
					}
				});
			}
			if (contextMenu.parentMenuItemId = 'interval') {
				chrome.storage.local.get(['interval', 'intervals'], settings => {
					if (contextMenu.menuItemId === 'custom') {
						let newInterval = prompt(`How much time should pass before fetching a new wallpaper?
							\n(in minutes, must be between 1 minute and 30 days, 0 for no repetition)`, settings.interval);
						if (newInterval) {
							newInterval = Number(newInterval);
							if (isNaN(newInterval) || newInterval >= 43200 || newInterval <= 1) {
								alert('Error: invalid amount of time');
								console.error('Error: invalid amount of time between alarms');
	//							chrome.contextMenus.update('custom', {'title': 'Custom'});
								setInterval(settings.interval);
							}
							else {
								setInterval(newInterval);
							}
						}
						else {
							setInterval(settings.interval);
						}
					}
					else {
						setInterval(Number(contextMenu.menuItemId));
					}
				})
			}
		});

		updateAlarm();
		chrome.alarms.onAlarm.addListener(alarm => {
			(alarm.name == 'get_wallpaper') && getWallpaper();
		});

		getWallpaper();
	}
	else {
		chrome.browserAction.setBadgeBackgroundColor({'color': [244, 67, 54, 255]});
		chrome.browserAction.setBadgeText({'text': 'X'});
		chrome.browserAction.setTitle({'title': 'Wallpapers only supported in ChromeOS'});
	}
});
