export default function generateSeed() {
    var today = new Date();

    var yearString = '' + today.getFullYear();

    var month = today.getMonth() + 1;
    var monthString = (month < 10? '0' : '') + month;

    var day = today.getDate();
    var dayString = (day < 10? '0' : '') + day;

    return yearString + monthString + dayString;
};
