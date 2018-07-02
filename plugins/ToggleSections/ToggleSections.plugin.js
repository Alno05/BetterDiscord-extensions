//META{"name":"ToggleSections"}*//

/*
    Installation
    ------------
    1. Save this file in %appdata%/BetterDiscord/plugins as ToggleSections.plugin.js
    2. Refresh Discord (ctrl+R) or simply restart it
    3. Go to Settings > BetterDiscord > Plugins and enable the plugin

    Changelog
    ---------
    v1.0    (April 3rd 2016):       Initial version
    v1.1    (April 5th 2016):       Added initial settings (choose which buttons to show, modify button color)
    v1.2    (April 6th 2016):       Improved settings, bug fixes
    v1.3    (April 7th 2016):       Refactoring
    v1.4    (January 10th 2017):    Fix misc. crashes, switch to new BD settings storage, refactor to ES6 class syntax
    v1.5    (May 6th 2017):         Added a Container class for simplified state management. Added hotkeys for toggling guild/channel sections
                                    Ctrl+Shift+X toggles guilds, Ctrl+Shift+C toggles channels
    v1.5.1  (August 10th 2017):     Fix styling when using Clean & Compact
    v1.5.2  (October 28th 2017):    Fix broken channels wrapper selector
    v1.5.3  (June 30th 2018):       Fix settings menu
    v1.6.0  (July 2nd 2018):        Expose hotkeys in settings, enable hiding buttons, reorganize settings menu, refactor
 */

class TSContainer {
    constructor(plugin, index, {label, className, position}) {
        this.plugin = plugin;
        this.index = index
        this.label = label;
        this.className = className;
        this.position = position;

        this.attachHandler = this.attachHandler.bind(this);
        this.removeHandlers = this.removeHandlers.bind(this);
        this.close = this.close.bind(this);
        this.toggle = this.toggle.bind(this);
    }

    get isClosed() {
        return this.plugin.settings.closed[this.index];
    }

    get isEnabled() {
        return this.plugin.settings.enabled[this.index];
    }

    get keyCode() {
        return this.plugin.settings.keyCode[this.index];
    }

    get containerElem() {
        return $(`.${this.className}`);
    }

    get buttonElem() {
        return $(`#toggle-${this.className}`);
    }

    get buttonElemExists() {
        return $(`#toggle-${this.className}`).length > 0;
    }

    attachHandler() {
        const {
            buttonElem,
            buttonElemExists,
            containerElem,
            handleClick,
            isClosed,
            isEnabled,
            index,
            position,
            className,
            plugin,
            close,
            toggle,
        } = this;

        if (buttonElemExists && !isEnabled)
            return this.removeHandlers();

        if (buttonElemExists || !isEnabled)
            return;

        containerElem.prepend(`<span class="toggle-section ${position}" id="toggle-${className}"></span>`);
        containerElem.addClass("toggleable");

        if(isClosed) close();

        $(`#toggle-${className}`).on("click.ts", toggle);
    }

    removeHandlers() {
        const { buttonElem } = this;
        buttonElem.off("click.ts");
        buttonElem.remove();
    }

    close() {
        const { containerElem } = this;
        containerElem.addClass("closed");
    }

    toggle() {
        const { plugin, index, containerElem, isClosed } = this;
        isClosed
            ? containerElem.removeClass("closed")
            : containerElem.addClass("closed");
        plugin.settings.closed[index] = !isClosed;
        plugin.updateSettings();
    }
}

// Default settings for the first run, after that stored settings will be used
const defaultSettings = {
    enabled: [true, true],
    closed: [false, false],
    keyCode: [88, 67],
    color: "#738BD7",
    hideButtons: false,
};

class ToggleSections {
    constructor() {
        this.settings = defaultSettings;

        this.start = this.start.bind(this);
        this.onSwitch = this.onSwitch.bind(this);
        this.observer = this.observer.bind(this);
        this.stop = this.stop.bind(this);
        this.addStyling = this.addStyling.bind(this);
        this.setupHotkeys = this.setupHotkeys.bind(this);
        this.getSettingsPanel = this.getSettingsPanel.bind(this);
        this.updateSettings = this.updateSettings.bind(this);
    }

    get guildContainer() {
        return this.containers[0];
    }

    get channelContainer() {
        return this.containers[1];
    }

    getName() {
        return "Toggle Sections";
    }

    getDescription() {
        return "Allows you to hide sections of the program (check settings to modify)";
    }

    getVersion() {
        return "1.6.0";
    }

    getAuthor() {
        return "kettui /Cin";
    }

    load() {}
    unload() {}
    onMessage() {}

    start() {
        const { onSwitch, addStyling, setupHotkeys } = this;

        if(!bdPluginStorage.get("ToggleSections", "settings"))
            bdPluginStorage.set("ToggleSections", "settings", JSON.stringify(defaultSettings));

        this.settings = Object.assign({}, defaultSettings, JSON.parse(bdPluginStorage.get("ToggleSections", "settings")));

        // There's no fixed .channels-wrap element to target anymore, so need to look for the element
        const channelsClassName = $("*[class^=\"channels-\"]").attr("class").split(" ").find(cn => cn.startsWith("channels-"))

        this.containers = [
            new TSContainer(this, 0, { label: "Guild list", className: "guilds-wrapper", position: "right" }),
            new TSContainer(this, 1, { label: "Channel list", className: channelsClassName, position: "right" }),
        ];

        onSwitch();
        addStyling();
        setupHotkeys();
    }

    onSwitch() {
        const { containers } = this;
        containers.forEach(container => container.attachHandler());
    }

    observer(e) {
        if(e.target.classList.contains("toggleable"))
            this.onSwitch();
    }

    stop() {
        $("#toggle-sections").remove();
        $(document).off("keypress.ts");
        this.containers.forEach(container => container.removeHandlers());
    };

    addStyling() {
        const { containers, settings } = this;
        if($("#toggle-sections").length) $("#toggle-sections").html("");

        let css = [
            ".channel-members-wrap { min-width: 0; }",

            ".toggleable.closed { overflow: visible !important; width: 0 !important; }",
            ".toggleable.closed > *:not(.toggle-section) { opacity: 0 !important; }",

            ".toggle-section {",
                settings.hideButtons ? "display: none;" : "",
                "position: absolute;",
                "bottom: 0;",
                "z-index: 6;",
                "cursor: pointer;",
                "opacity: .4 !important;",
                "border-width: 10px 0;",
                "border-style: solid;",
                `border-color: transparent ${settings.color}`,
            "}",

            ".toggle-section:hover { opacity: 1 !important; }",

            ".toggle-section.right { right: 0; border-right-width: 10px; z-index: 999; }",

            ".toggleable.closed .toggle-section.right {",
                "right: -10px;",
                "border-left-width: 10px;",
                "border-right-width: 0;",
            "}",

            ".toggle-section.left { left: 0; border-left-width: 10px }",

            ".toggleable.closed .toggle-section.left {",
                "left: -10px;",
                "border-right-width: 10px;",
                "border-left-width: 0;",
            "}",

            ".channel-members-wrap.closed .toggle-section { left: -30px; }"
        ];

        // Ensure that the containers are positioned relatively
        containers.forEach(container => {
            css.push(`.${container.className}{ position: relative; transition: width 150ms; }`);
        });

        css = css.join(" ");

        if ($("#toggle-sections").length > 0)
            $("#toggle-sections").remove();

        $("head").append(`<style id="toggle-sections">${css}</style>`);
    }

    setupHotkeys() {
        const { containers, settings } = this
        $(document).off("keydown.ts");
        $(document).on("keydown.ts", ({ ctrlKey, shiftKey, keyCode }) => {
            if(!ctrlKey || !shiftKey) return;

            containers.forEach(container => {
                if(container.isEnabled && container.keyCode == keyCode)
                    container.toggle();
            });
        });
    }

    getSettingsPanel() {
        const { containers, settings, addStyling, updateSettings, onSwitch, setupHotkeys } = this;

        const settingsContainer = $("<div/>", { id: "ts-settings" });

        const containersTable = $("<table />");

        containersTable.append("<tr><th>Name</th><th>Enabled</th><th>Keybind</th></tr>");

        containers.forEach((container, i) => {
            const tableRow = $("<tr />");

            tableRow.append($("<td />").append($("<span />", {
                text: container.label
            })));

            tableRow.append($("<td />").append($("<input />", {
                type: "checkbox",
                "data-ts-i": i,
                checked: container.isEnabled,
                id: `ts-${container.className}`,
                click() {
                    settings.enabled[container.index] = !settings.enabled[container.index];
                    updateSettings();
                    onSwitch();
                }
            })));

            tableRow.append($("<td />").append($("<input />", {
                type: "text",
                "data-ts-i": i,
                id: `ts-${container.className}`,
                value: `CTRL+Shift+${String.fromCharCode(container.keyCode)}`,
                keyup({ keyCode }) {
                    this.value = `CTRL+Shift+${String.fromCharCode(keyCode)}`;
                    settings.keyCode[container.index] = keyCode;
                    setupHotkeys();
                    updateSettings();
                },
            })));

            containersTable.append(tableRow);
        });

        settingsContainer.append(containersTable, "<br/>");

        const colorPicker = $("<input/>", {
            type: "color",
            class: "swatch default",
            id: "color-picker",
            value: settings.color,
            change() {
                settings.color = this.value;
                addStyling();
                updateSettings();
            }
        });

        settingsContainer.append("<span>Button Color</span>", colorPicker, "<br/>");

        const hideButtonsCheckbox = $("<input/>", {
            type: "checkbox",
            checked: settings.hideButtons,
            click() {
                settings.hideButtons = !settings.hideButtons;
                addStyling();
                updateSettings();
            }
        });

        settingsContainer.append("<span>Hide Buttons</span>", hideButtonsCheckbox);

        return $(settingsContainer)[0];
    }

    updateSettings() {
        bdPluginStorage.set("ToggleSections", "settings", JSON.stringify(this.settings));
    }
}

ToggleSections.Container = TSContainer;
