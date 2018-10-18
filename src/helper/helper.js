function keepFields(objects, fields) {
    return objects.map(object => {
        const newObj = {};
        for (let field of fields) {
            newObj[field] = object[field];
        }
        return newObj;
    })
}

export default {
    keepFields,
}
