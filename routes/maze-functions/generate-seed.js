export default function generateSeed() {
    var today = new Date();
    return (today.getFullYear() + '/' + today.getMonth() + '/' + today.getDay());
};
