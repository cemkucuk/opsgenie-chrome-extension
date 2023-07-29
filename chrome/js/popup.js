chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'session') {
        return renderAlerts()
    }
});

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('reload').addEventListener('click', (e) => {
        e.preventDefault()

        chrome.runtime.sendMessage({
            action: 'reload'
        }, (error) => {
            if (error) {
                window.alert(error)
            }
        })
    });
});

(async () => {
    await renderAlerts()
})()

async function renderAlerts() {
    const elemAlerts = document.getElementById("alerts")
    const elemInfo = document.getElementById("result")
    const settings = await chrome.storage.sync.get()
    const {popup} = await chrome.storage.session.get('popup')
    elemAlerts.innerHTML = ''

    if (!popup) {
        elemInfo.innerHTML = `<p style="color:#BF2600">Loading ...</p>`
        return
    }

    if (!popup.ok) {
        elemInfo.innerHTML = `<p style="color:#BF2600">${popup.data}</p>`
        return
    }

    elemInfo.innerHTML = `<i>Last updated @ ${popup.time}</i><a style="float: right;" href="${popup.ogUrl}" target="_blank"> see all alerts↗</a>`
    if (popup.data.length === 0) {
        elemInfo.innerHTML += "<p style=\"text-align:center\"> There are no alerts.  🎉</p>"
        return
    }

    popup.data.forEach((alert, i) => {
        let alertRow = `<tr class="alert" id="${alert.id}"><td class="alert-action">`
        if (settings.username) {
            if (alert.acknowledged) {
                alertRow += `<a href="#" class="handleAlert" data-action="close" data-id="${alert.id}">[CLOSE]</a>`
            } else {
                alertRow += `<a href="#" class="handleAlert" data-action="acknowledge" data-id="${alert.id}">[ACK]</a>`
            }
        }
        alertRow += `</td><td class="alert-count">x${alert.count}</td><td><span class="alert-priority ${alert.priority}-bg">${alert.priority}</span></td><td class="alert-message">${alert.message}</td></tr>`

        elemAlerts.insertAdjacentHTML('beforeend', alertRow)
    })

    if (settings.username) {
        [...(document.getElementsByClassName('handleAlert'))].forEach(d => {
            d.addEventListener('click', (e) => {
                e.preventDefault();

                chrome.runtime.sendMessage({
                    action: e.target.dataset.action,
                    id: e.target.dataset.id,
                }, (error) => {
                    if (error) {
                        window.alert(error)
                    }
                })
            });
        })
    }


    [...(document.getElementsByClassName('alert-message'))].forEach(d => {
        d.addEventListener('click', (e) => {
            e.preventDefault()

            let url = "https://"
            if (settings.customerName !== '') {
                url += `${settings.customerName}.`
            }
            url += `app.opsgenie.com/alert/detail/${e.target.parentElement.id}/details`

            window.open(url, '_blank')
        });
    })
}
