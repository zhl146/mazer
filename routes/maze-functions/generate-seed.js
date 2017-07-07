exports.generate = function() {
    var today = new Date();
    return (today.getFullYear() + '/' + today.getMonth() + '/' + today.getDay());
};
