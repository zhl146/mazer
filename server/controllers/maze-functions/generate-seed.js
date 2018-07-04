export default function SeedUtil() {}

SeedUtil.dateToSeed = function(date) {
    let yearString = "" + date.getFullYear();

    let month = date.getMonth() + 1;
    let monthString = (month < 10 ? "0" : "") + month;

    let day = date.getDate();
    let dayString = (day < 10 ? "0" : "") + day;
    console.log(date, day, dayString);

    return yearString + monthString + dayString;
};

SeedUtil.seedToDate = function(seed) {
    console.log(seed);
    if (!seed || seed.length !== 8) {
        return null;
    }

    let yearString = seed.substring(0, 4);
    let monthString = seed.substring(4, 6);
    let dayString = seed.substring(6, 8);

    let year = Number.parseInt(yearString);
    let month = Number.parseInt(monthString) - 1;
    let day = Number.parseInt(dayString);

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return null;
    }

    return new Date(year, month, day);
};
