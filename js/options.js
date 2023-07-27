document.querySelector('title').textContent = chrome.i18n.getMessage('optionsTitle');
document.querySelector('h1 > span').textContent = chrome.i18n.getMessage('optionsTitle');
document.querySelector('label[for=enabled]').textContent = chrome.i18n.getMessage('optionsEnabled');
document.querySelector('label[for=region]').textContent = chrome.i18n.getMessage('optionsRegion');
document.querySelector('label[for=customer-name]').textContent = chrome.i18n.getMessage('optionsCustomerName');
document.querySelector('label[for=ack-user]').textContent = chrome.i18n.getMessage('optionsAckUser');
document.querySelector('label[for=api-key]').textContent = chrome.i18n.getMessage('optionsApiKey');
document.querySelector('label[for=query]').textContent = chrome.i18n.getMessage('optionsAlertQuery');
document.querySelector('label[for=time-interval]').textContent = chrome.i18n.getMessage('optionsTimeInterval');
document.querySelector('label[for=popup-height]').textContent = chrome.i18n.getMessage('optionPopupHeight');
document.querySelector('button').textContent = chrome.i18n.getMessage('optionsButtonSave');

document.addEventListener('DOMContentLoaded', async () => {
    const settings = await chrome.storage.sync.get({
        enabled: true,
        region: 'US',
        customerName: '',
        apiKey: '',
        ackUser: '',
        timeInterval: 1,
        query: '',
        popupHeight: 300,
    });

    document.getElementById('enabled').checked = settings.enabled
    document.getElementById('region').value = settings.region;
    document.getElementById('customer-name').value = settings.customerName;
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('ack-user').value = settings.ackUser;
    document.getElementById('query').value = settings.query;
    document.getElementById('time-interval').value = parseInt(settings.timeInterval)
    document.getElementById('popup-height').value = parseInt(settings.popupHeight)
});


document.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault()

    document.getElementById('form-alert').value = ""

    await chrome.storage.sync.set({
        enabled: document.getElementById('enabled').checked,
        region: document.getElementById('region').value,
        customerName: document.getElementById('customer-name').value,
        apiKey: document.getElementById('api-key').value,
        ackUser: document.getElementById('ack-user').value,
        query: document.getElementById('query').value,
        timeInterval: parseInt(document.getElementById('time-interval').value) || 1,
        popupHeight: parseInt(document.getElementById('popup-height').value) || 300,
    })

    document.getElementById('form-alert').textContent = "Saved successfully, badge will be refreshed now!"
});
