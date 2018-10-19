function keepFields(objects, fields) {
    return objects.map(object => {
        const newObj = {};
        for (let field of fields) {
            newObj[field] = object[field];
        }
        return newObj;
    })
}

function roundToTwoDecimalSpaces(num) {
    return Math.round(num * 100) / 100;
}

export default {
    keepFields, roundToTwoDecimalSpaces
}
