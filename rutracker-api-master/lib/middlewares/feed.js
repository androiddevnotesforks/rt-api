module.exports = (params, body, url) => {
    const { feed } = params;
    url.searchParams.append("f", feed);
};