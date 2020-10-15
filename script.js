let sched;
let notifications_on;
let sound_notifications_on;
let last_class;
let sched_info;
let class_update_loop_timeout;
let timer_update_loop_timeout;
let activity_aliases = {};

// initialize audio object
ding_audio = new Audio("sounds/Ding-sound-effect.mp3");

// Playing a completely silent track of audio is done so that firefox will block the autoplay as soon as you open the site
// instead of later when the notification sound is supposed to ring, this makes it so the browser shows the option to
// unblock autoplay for the site.
new Audio("sounds/2-seconds-of-silence.mp3").play();

$.getJSON("sched.json?4", function (data) {
    sched = data;
    $(function() {
        //create alias settings based on config
        for (let activity of sched["aliasable_activities"]) {
            $("#alias-form").append(`<div class="form-group row class-alias-group">
                                         <label for="${activity}" class="col-sm-2 col-form-label class-alias-label">${activity}</label>
                                         <div class="col-sm-10">
                                             <input class="form-control form-control-sm" id="class-alias${activity}" type="text" name="${activity}" placeholder="${activity}">
                                         </div>
                                     </div>`);
        }

        // get class aliases and set values in settings form
        let aliases_cookie = getCookie("aliases")
        if (aliases_cookie.length !== 0) {
            activity_aliases = JSON.parse(aliases_cookie);
            for (const [name, value] of Object.entries(activity_aliases))
                $(`#alias-form input[name='${name}']`).val(value);
        }

        // start update loop
        class_update_loop_timeout = class_update_loop(true);

        //set event listeners
        $("#gearIcon").click(function() {
            $("#settingsModal").modal("show");
        });

        $("#calenderIcon").click(function() {
            $("#calenderModal").modal("show");
        });

        $("#notifySwitch").change(function () {
            // Check if perms are granted for notifications, if they aren't request permission
            if (this.checked && Notification.permission !== "granted") {
                Notification.requestPermission();
            }
            notifications_on = this.checked;
            setCookie("notifications_on", Number(this.checked), 1000);
        });

        $("#soundSwitch").change(function () {
            if (this.checked) {
                $("#sound_note").show();
            } else {
                $("#sound_note").hide();
            }
            sound_notifications_on = this.checked;
            setCookie("sound_notifications_on", Number(this.checked), 1000);
        });

        $('#settings').on('hide.bs.modal', function (e) {
            for (let form_element of $("#alias-form").serializeArray())
                activity_aliases[form_element.name] = form_element.value;
            restartLoops();
            setCookie("aliases", JSON.stringify(activity_aliases), 1000);
        });

        // set notifications bool according to cookies
        notifications_on = Boolean(Number(getCookie("notifications_on")));
        sound_notifications_on = Boolean(Number(getCookie("sound_notifications_on")));
        // set switches to corresponding positions
        $("#notifySwitch").prop("checked", notifications_on);
        // change triggers an event update for the element, allowing for the note to be shown or hidden as needed
        $("#soundSwitch").prop("checked", sound_notifications_on).change();

    });
});

function class_update_loop(notify_on_first_iter=false) {
    sched_info = get_sched_info();
    if (sched_info.activity !== undefined) {
        // If there's an ongoing activity
        $("body").animate({backgroundColor: sched_info.activity[3]}, 1000);
        $("#activity").text(getAlias(sched_info.activity[0]));
        if (sched_info.next_activity !== undefined)
            $("#next_class").text("Next: " + getAlias(sched_info.next_activity[0]));
        timer_update_loop_timeout = timer_update_loop(sched_info.activity[2], sched_info.activity[0], true);
        if (!notify_on_first_iter) {
            if (sound_notifications_on)
                ding_audio.play();
            if (notifications_on)
                new Notification(getAlias(sched_info.activity[0]) + " started");
        }
        last_class = sched_info.activity;
    } else if (sched_info.next_activity !== undefined) {
        // if there's a next activity and no ongoing activity
        $("body").animate({backgroundColor: sched["no_activity_color"]}, 1000);
        $("#activity").text(getAlias(sched_info.next_activity[0]) + " starting in");
        timer_update_loop_timeout = timer_update_loop(sched_info.next_activity[1], sched_info.next_activity[0], false);
        if (!notify_on_first_iter) {
            if (sound_notifications_on && last_class !== undefined)
                ding_audio.play();
            if (notifications_on && last_class !== undefined)
                new Notification(getAlias(last_class[0]) + " has ended");
        }
    } else {
        // if there's no next activity and no ongoing activity
        $("body").animate({backgroundColor: sched["no_activity_color"]}, 1000);
        $("#activity").text("No current class!");
        document.title = "No current class!";
        class_update_loop_timeout = setTimeout(class_update_loop, 10000);
    }
}

function timer_update_loop(to_time, activity, to_start=true) {
    let current_date = new Date();
    let midnight = new Date().setHours(0, 0, 0, 0);
    let end_date = new Date(midnight + (to_time * 1000));
    let ends_in_sec = Math.ceil((end_date - current_date) / 1000);
    let timer_str = "";
    let title_str = "";
    if (ends_in_sec <= 0) {
        $("#timer").text('');
        $("#activity").text('');
        $("#next_class").text('');
        class_update_loop_timeout = class_update_loop();
        return;
    } else if (ends_in_sec < 60) {
        timer_str = ends_in_sec + " seconds";
        title_str = ends_in_sec + "s";
    } else if (ends_in_sec < 3600) {
        let minutes_left = Math.ceil((ends_in_sec / 60));
        timer_str = minutes_left + " minutes";
        title_str = minutes_left + "m";
    } else if (ends_in_sec <= 86400) {
        let hours_left = Math.floor(ends_in_sec / 3600);
        let minutes_left = Math.ceil((ends_in_sec % 3600) / 60);
        title_str = `${hours_left}h ${minutes_left}m`;
        if (minutes_left === 60) {
            // corrects for when there is more than an hour and 60 minutes
            timer_str = (hours_left + 1) + " hours";
            title_str = `${hours_left + 1}h`;
        } else if (minutes_left > 0) {
            timer_str = hours_left + " hour and " + minutes_left + " minutes";
        } else {
            timer_str = hours_left + " hours";
        }
    }
    if (to_start) {
        $("#timer").text(timer_str + " left");
        document.title = `${title_str} left of ${getAlias(activity)}`;
    } else {
        $("#timer").text(timer_str);
        document.title = `${title_str} till ${getAlias(activity)}`;
    }
    timer_update_loop_timeout = setTimeout(function() {timer_update_loop(to_time, activity, to_start)}, 1000);
}

function get_sched_info() {
    let date = new Date();
    let day_of_year = dayOfYear(date);
    let week_of_year = date.getWeek();
    let seconds_since_midnight = getSecondsSinceMidnight(date);
    let during_year = true;
    let activity;
    let week;
    let day;
    let next_activity;
    // Check if school is ongoing
    if (sched["active_epoch_range"][0] <= Date.now() / 1000 <= sched["active_epoch_range"][1]) {
        // Check if the day is a special day off
        if (!(sched["day_off_exclusions"].includes(day_of_year))) {
            // Checks if week is a non default week and set the correct week
            if (week_of_year in sched["default_week_exclusions"]) {
                week = sched["weeks"][sched["default_week_exclusions"][week_of_year]];
            } else {
                week = sched["weeks"]["default"];
            }
            // gets the current day of the week
            if (day_of_year in sched["day_exclusions"]) {
                day = sched["days"][sched["day_exclusions"][day_of_year]];
            } else {
                day = sched["days"][week[date.getDay()]];
            }
            // gets current hour, if any
            for (const entry of day) {
                if (entry[1] <= seconds_since_midnight && seconds_since_midnight <= entry[2]) {
                    activity = entry;
                    break;
                }
            }
            // find next nearest activity of the day
            let temp_activity = ["temp", 1000000];
            for (const entry of day) {
                if (entry[1] > seconds_since_midnight && temp_activity[1] > entry[1]) {
                    temp_activity = entry;
                    next_activity = entry;
                }
            }
        }
    } else {
        //If not during school year
        during_year = false;
    }
    return {
        during_year: during_year,
        activity: activity,
        next_activity: next_activity
    };
}

function getAlias(activity_name) {
    if (activity_name in activity_aliases && activity_aliases[activity_name].length !== 0) {
        return activity_aliases[activity_name];
    }
    return activity_name
}

// restarts the main loop, forcing for changes to be applied immediately
function restartLoops() {
    clearInterval(class_update_loop_timeout);
    clearInterval(timer_update_loop_timeout);
    class_update_loop(true);
}

dayOfYear = date => Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

function getSecondsSinceMidnight(d) {
    let e = new Date(d);
    e.setHours(0,0,0,0);
    return Math.ceil((d - e)/1000);
}

Date.prototype.getWeek = function() {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    var week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
        - 3 + (week1.getDay() + 6) % 7) / 7);
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";SameSite=Lax;path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
