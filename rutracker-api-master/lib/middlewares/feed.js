module.exports = (params, body, url) => {
    const { feeds } = params;
    if (feeds) {
        url.searchParams.append("f", feeds.join(","));
    }
};