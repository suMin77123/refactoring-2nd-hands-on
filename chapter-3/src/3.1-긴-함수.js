function extractLinearIssue({ manualLabel, baseBranch, project }) {
  const messageLog = [];
  const skippedCommits = [];
  let githubNotes = "";
  let notionNotes = "";
  let currentDate = new Date().toISOString();

  initMessageLog(manualLabel, baseBranch, project);

  const manualEvent = validateManualLabel(manualLabel);
  if (manualEvent) return manualEvent;

  const unsupportedBaseBranch = validateBaseBranch(baseBranch);
  if (unsupportedBaseBranch) return unsupportedBaseBranch;

  const PREFIX = `${project}-v`;

  messageLog.push(`📊 Extracting merge commits from range: ${RANGE}`);

  const commitHashes = extractCommitHashes(
    setRange(findLastTag(baseBranch, PREFIX))
  );

  for (const commitHash of commitHashes) {
    const firstLine = validateFirstLine(commitHash);

    if (!firstLine) {
      skipFirstLine(commitHash);
      continue;
    }

    const match = firstLine.match(/^(SYS[A-Z]+-[0-9]+)\s+(.+)$/);

    if (match) {
      const { githubNotes: newGithubNotes, notionNotes: newNotionNotes } =
        generateReleaseNotes(match);
      githubNotes += newGithubNotes;
      notionNotes += newNotionNotes;
    } else {
      skipMatch(firstLine);
    }
  }

  const { githubNotes: newGithubNotes, notionNotes: newNotionNotes } =
    fallbackToNoReleaseNotes(githubNotes, notionNotes);
  githubNotes = newGithubNotes;
  notionNotes = newNotionNotes;

  return {
    githubNotes,
    notionNotes,
    currentDate,
    messageLog,
    skippedCommits,
  };

  function initMessageLog(manualLabel, baseBranch, project) {
    messageLog.push(
      `🔎 inputs: manualLabel="${manualLabel}", baseBranch="${baseBranch}", project="${project}"`
    );
  }

  function validateManualLabel(manualLabel) {
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
    return null;
  }

  function validateBaseBranch(baseBranch) {
    if (!isStageOrMaster(baseBranch)) {
      messageLog.push(`❌ Unsupported branch for release notes: ${baseBranch}`);
      return {
        githubNotes,
        notionNotes,
        currentDate,
        messageLog,
        skippedCommits,
      };
    }
    return null;
  }

  function isStageOrMaster(baseBranch) {
    return baseBranch === "stage" || baseBranch === "master";
  }

  function createBranch(baseBranch, PREFIX) {
    if (baseBranch === "stage") {
      return new StageBranch(baseBranch, PREFIX);
    } else if (baseBranch === "master") {
      return new MasterBranch(baseBranch, PREFIX);
    }
  }

  function findLastTag(baseBranch, PREFIX) {
    const branch = createBranch(baseBranch, PREFIX);
    return branch.lastTag;
  }

  function setRange(lastTag) {
    if (lastTag) {
      messageLog.push(`✅ Last release tag found: ${lastTag}`);
      RANGE = `${lastTag}..HEAD`;
      return RANGE;
    } else {
      messageLog.push(
        "⚠️ No previous release tag found, using last 100 commits"
      );
      RANGE = "HEAD~100..HEAD";
      return RANGE;
    }
  }

  function extractCommitHashes(RANGE) {
    const commitHashes = execSync(
      `git log --oneline --grep="^Merge pull request" --format="%H" ${RANGE}`
    )
      .toString()
      .trim()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    return commitHashes;
  }

  function validateFirstLine(commitHash) {
    const firstLine = execSync(`git log --format="%b" -n 1 ${commitHash}`)
      .toString()
      .split(/\r?\n/)[0]
      .trim();
    return firstLine;
  }

  function skipFirstLine(commitHash) {
    skippedCommits.push(commitHash);
    messageLog.push(`⏭️ Skipping (no body): ${commitHash}`);
  }

  function generateReleaseNotes(match) {
    const ISSUE_ID = match[1];
    const ISSUE_TITLE = match[2];
    messageLog.push(`✅ Found: ${ISSUE_ID} - ${ISSUE_TITLE}`);

    githubNotes += `### <a href="https://linear.app/piaspace/issue/${ISSUE_ID}">${ISSUE_ID} ${ISSUE_TITLE}</a>\n`;
    notionNotes += `${ISSUE_ID} ${ISSUE_TITLE}\nhttps://linear.app/piaspace/issue/${ISSUE_ID}\n\n`;

    return {
      githubNotes,
      notionNotes,
    };
  }

  function skipMatch(firstLine) {
    skippedCommits.push(firstLine);
    messageLog.push(`⏭️ Skipping (not SYS format): ${firstLine}`);
  }

  function fallbackToNoReleaseNotes(githubNotes, notionNotes) {
    if (!githubNotes && !notionNotes) {
      messageLog.push("ℹ️ No SYS-prefixed commits found in the range");
      githubNotes = "No SYS-prefixed pull requests merged in this release.";
      notionNotes = "No SYS-prefixed pull requests merged in this release.";
    }

    return {
      githubNotes,
      notionNotes,
    };
  }
}

class Branch {
  constructor(baseBranch) {
    this.baseBranch = baseBranch;
  }
}

class StageBranch extends Branch {
  constructor(baseBranch, PREFIX) {
    super(baseBranch);
    this.PREFIX = PREFIX;
  }

  get lastTag() {
    const tags = execSync(
      `git tag --list "${this.PREFIX}*-rc*" --sort=-v:refname`
    )
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    return tags[0] || "";
  }
}

class MasterBranch extends Branch {
  constructor(baseBranch, PREFIX) {
    super(baseBranch);
    this.PREFIX = PREFIX;
  }

  get lastTag() {
    const tags = execSync(`git tag --list "${this.PREFIX}*" --sort=-v:refname`)
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
    return tags.find((t) => !/-(dev|rc)[0-9]+$/.test(t)) || "";
  }
}
