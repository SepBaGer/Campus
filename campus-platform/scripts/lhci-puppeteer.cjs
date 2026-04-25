module.exports = async function prepareLighthouseRun(browser) {
  const pages = await browser.pages();
  await Promise.all(
    pages.slice(1).map((page) =>
      page.close().catch(() => {
        // A stale page should not fail the performance gate setup.
      }),
    ),
  );
};
