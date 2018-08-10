const matched = subject => ({
    on: () => matched(subject),
    otherwise: () => subject
})

module.exports.match = subject => ({
    on: (predicate, handler) => predicate(subject) ? matched(handler(subject)) : match(subject),
    otherwise: handler => handler(subject)
})

module.exports.matchReciver = subjectObtainer => {
    const comparator = {
        value: null,
        set: new_value => value = new_value
    }

    return {
        is: value => option => comparator.set(value) == subjectObtainer(option),
        not: value => option => comparator.set(value) != subjectObtainer(option)
    }
}