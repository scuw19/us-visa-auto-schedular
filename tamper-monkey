// ==UserScript==
// @name         csuna visa
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically log in and book appointments on ais.usvisa-info.com
// @match        https://ais.usvisa-info.com/*/niv/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var email = 'xxxxx';
    var pwd = xxxxxx';
    var start = '2025-01-01';
    var end = '2025-01-01';
    var exclude = ['2025-04-01', '2025-04-02'];
    var locationId = 95;
    var country = 'ca';
    var intervalSecond = 1 * 40;

    const delay = (s) => new Promise((r) => setTimeout(r, s * 1000));
    const reload = async (s) => (await delay(s), (location.href = location.href));
    const ajaxGet = (u, t) =>
        $.ajax({ url: u, type: 'GET', timeout: t }).fail((jq, x, e) => {
            if (jq.status === 401) {
                window.location.href = `/en-${country}/niv/users/sign_in`;
            } else {
                console.error(e);
                log(`Ajax error on ${u}: ${x}`, e);
            }
        });

    const getTime = () => {
        const d = new Date();
        return d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
    };

    const showToast = (msg, duration = 3000) => {
        const toast = Object.assign(document.createElement('div'), {
            textContent: msg,
            style: 'position:fixed;bottom:60%;left:50%;transform:translateX(-50%);background:rgba(0, 0, 0, 0.7);color:white;padding:10px 20px;border-radius:5px;z-index:10000',
        });
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.5s';
            toast.style.opacity = 0;
            setTimeout(() => document.body.removeChild(toast), 500);
        }, duration);
    };

    const log = (m) => {
        let c = $('#log_container');
        if (!c.length) return;
        c.find('div').length > 60 && c.empty();
        c.append(`<div>${getTime()} ${m}</div>`);
        c[0].scrollTop = c[0].scrollHeight;
    };

    const login = async () => {
        showToast('Auto Login...');
        await delay(3);

        const checkbox = $('#policy_confirmed');
        if (checkbox.length && !checkbox.prop('checked')) {
            checkbox.prop('checked', true);
            checkbox.trigger('change');
        }

        $('#user_email').val(email);
        $('#user_password').val(pwd);
        $('[name=commit]').trigger('click');

        await delay(2);

        const popup = $('.ui-dialog.infoPopUp:visible');
        if (popup.length) {
            const alertText = popup.find('.alert').text().trim();
            if (alertText.includes('sign in or sign up before continuing')) {
                showToast('Detected sign-in popup. Clicking OK...');
                popup.find('button:contains("OK")').trigger('click');
                return;
            }
        }

        const error = $('#sign_in_form').find('.error').text().trim();
        if (error.includes('Invalid email or password')) {
            showToast(error);
        } else {
            reload(10);
        }
    };

    const doJob = async () => {
        try {
            const daysUrl = `appointment/days/${locationId}.json?appointments[expedite]=false`;
            var dayData = await ajaxGet(daysUrl, 4500);
            var days = dayData.map(({ date }) => date);
            log(days.length > 0 ? 'Earlist date:' + days[0] : 'No available dates');
            const suitable = days.filter(
                (x) => x >= start && x <= end && !exclude.includes(x)
            );
            if (!suitable.length) return;

            const date = suitable[0];
            const timesUrl = `appointment/times/${locationId}.json?appointments[expedite]=false&date=${date}`;
            const timeData = await ajaxGet(timesUrl, 4500);
            if (!timeData.available_times.length) {
                log('No available times');
                return;
            }

            const time = timeData.available_times[0];
            $('#appointments_consulate_appointment_facility_id').val(locationId);
            $('#appointments_consulate_appointment_date').val(date);
            $('#appointments_consulate_appointment_time')
                .empty()
                .append(new Option(time, time))
                .val(time);
            $('#appointment-form').trigger('submit');
        } catch (e) {
            log(e);
        }
    };

    const route = async () => {
        const u = window.location.href;
        if (document.title === 'Under construction (503)') await reload(10);
        else if (u.endsWith('niv/users/sign_in')) {
            await login();
        } else if (u.includes('niv/groups/')) {
            showToast('Looking for Continue button...');
            await delay(2);
            for (let i = 0; i < 10; i++) {
                const continueBtn = $("a.button.primary.small[href*='continue_actions']");
                if (continueBtn.length > 0) {
                    showToast('Found Continue. Navigating to appointment page...');
                    await delay(1);
                    location.href = continueBtn.attr('href').replace('continue_actions', 'appointment');
                    return;
                }
                await delay(1);
            }
            showToast('Could not find Continue button after 10 seconds.');
        } else if (u.endsWith('/appointment')) {
            showToast('Load Appointment Page...');
            $('#appointments_consulate_appointment_facility_id').val(locationId);
            $('#consulate_date_time').show();
            $('#appointments_consulate_appointment_date').removeAttr('readonly');
            $('#appointments_submit').removeAttr('disabled');
            $('#consulate_left').append(
                `<div id='log_container' class='margin-right-0 card' style='overflow: auto; height: 240px; margin-left:0; padding:15px'></div>`
            );
            log(
                `Desired Range: [${start} to ${end}], exclude:[${exclude}], interval:${intervalSecond}s`
            );
            await delay(5);
            doJob();
            setInterval(doJob, intervalSecond * 1000);
        } else {
            showToast('Not a valid page for auto booking.');
        }
    };

    $('.emergency-announcement').hide();
    route();
})();
