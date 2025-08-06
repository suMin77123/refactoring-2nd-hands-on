function extractLinearIssue({ manualLabel, baseBranch, project }) {
  const messageLog = [];
  const skippedCommits = [];
  let githubNotes = "";
  let notionNotes = "";
  let currentDate = new Date().toISOString();

  messageLog.push(
    `🔎 inputs: manualLabel="${manualLabel}", baseBranch="${baseBranch}", project="${project}"`
  );

  if (manualLabel !== "") {
    messageLog.push(
      "ℹ️ manual_label provided — skipping automated extraction."
    );
    return {
      githubNotes,
      notionNotes,
      currentDate,
      messageLog,
      skippedCommits,
    };
  }

  if (!(baseBranch === "stage" || baseBranch === "master")) {
    messageLog.push(`❌ Unsupported branch for release notes: ${baseBranch}`);
    return {
      githubNotes,
      notionNotes,
      currentDate,
      messageLog,
      skippedCommits,
    };
  }

  const PREFIX = `${project}-v`;
  let lastTag = "";

  if (baseBranch === "stage") {
    messageLog.push("🔍 Stage branch: Looking for last RC version");
    const tags = execSync(`git tag --list "${PREFIX}*-rc*" --sort=-v:refname`)
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    lastTag = tags[0] || "";
  } else if (baseBranch === "master") {
    messageLog.push("🔍 Master branch: Looking for last stable version");
    const tags = execSync(`git tag --list "${PREFIX}*" --sort=-v:refname`)
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    lastTag = tags.find((t) => !/-(dev|rc)[0-9]+$/.test(t)) || "";
  }

  let RANGE = "";
  if (!lastTag) {
    messageLog.push("⚠️ No previous release tag found, using last 100 commits");
    RANGE = "HEAD~100..HEAD";
  } else {
    messageLog.push(`✅ Last release tag found: ${lastTag}`);
    RANGE = `${lastTag}..HEAD`;
  }

  messageLog.push(`📊 Extracting merge commits from range: ${RANGE}`);

  const commitHashes = execSync(
    `git log --oneline --grep="^Merge pull request" --format="%H" ${RANGE}`
  )
    .toString()
    .trim()
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const commitHash of commitHashes) {
    const firstLine = execSync(`git log --format="%b" -n 1 ${commitHash}`)
      .toString()
      .split(/\r?\n/)[0]
      .trim();

    if (!firstLine) {
      skippedCommits.push(commitHash);
      messageLog.push(`⏭️ Skipping (no body): ${commitHash}`);
      continue;
    }

    const match = firstLine.match(/^(SYS[A-Z]+-[0-9]+)\s+(.+)$/);
    if (match) {
      const ISSUE_ID = match[1];
      const ISSUE_TITLE = match[2];
      messageLog.push(`✅ Found: ${ISSUE_ID} - ${ISSUE_TITLE}`);

      githubNotes += `### <a href="https://linear.app/piaspace/issue/${ISSUE_ID}">${ISSUE_ID} ${ISSUE_TITLE}</a>\n`;
      notionNotes += `${ISSUE_ID} ${ISSUE_TITLE}\nhttps://linear.app/piaspace/issue/${ISSUE_ID}\n\n`;
    } else {
      skippedCommits.push(firstLine);
      messageLog.push(`⏭️ Skipping (not SYS format): ${firstLine}`);
    }
  }

  if (!githubNotes) {
    messageLog.push("ℹ️ No SYS-prefixed commits found in the range");
    githubNotes = "No SYS-prefixed pull requests merged in this release.";
    notionNotes = "No SYS-prefixed pull requests merged in this release.";
  }

  return {
    githubNotes,
    notionNotes,
    currentDate,
    messageLog,
    skippedCommits,
  };
}
