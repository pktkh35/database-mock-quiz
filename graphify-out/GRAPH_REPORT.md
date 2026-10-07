# Graph Report - database-mock-quiz  (2026-10-07)

## Corpus Check
- 40 files · ~20,149 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 182 nodes · 242 edges · 17 communities (12 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3cac6388`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `runQuery()` - 14 edges
2. `walk()` - 10 edges
3. `SQL Mock Exam — Specification` - 10 edges
4. `gradeOne()` - 8 edges
5. `scripts` - 7 edges
6. `checkRules()` - 7 edges
7. `parseSelect()` - 7 edges
8. `buildExpected()` - 5 edges
9. `getEngine()` - 5 edges
10. `getSchema()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getSchema()`  [INFERRED]
  src/app/api/schema/route.js → src/lib/engine/run.js
- `POST()` --calls--> `gradeAll()`  [INFERRED]
  src/app/api/submit/route.js → src/lib/grade.js
- `POST()` --calls--> `runMeta()`  [INFERRED]
  src/app/api/run/route.js → src/lib/engine/meta.js
- `POST()` --calls--> `runQuery()`  [INFERRED]
  src/app/api/run/route.js → src/lib/engine/run.js
- `ExamView()` --calls--> `formatDuration()`  [INFERRED]
  src/components/ExamView.js → src/lib/client.js

## Communities (17 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (24): questions, DATASET_LABELS, TOPICS, buildExpected(), byId, gradeAll(), gradeOne(), hashRows() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (20): getEngine(), runMeta(), astCache, containsMysql8Only(), MysqlError, OPT, parser, parseSelect() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (11): ExamView(), SqlEditor, useNow(), GLYPH, questionStatus(), STATUS_LABEL, BADGE, ResultPage() (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (17): devDependencies, tailwindcss, @tailwindcss/turbopack, ignoreScripts, name, packageManager, private, scripts (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (16): code:javascript ({), code:javascript ({), Functional requirements, Monaco Editor, SQL Mock Exam — Specification, การจำลอง MySQL 5.7, การตัดสินใจ, การตรวจคำตอบและคิดคะแนน (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (8): App(), COUNTS, clearState(), emptyState(), loadState(), probe(), saveState(), useExam()

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (8): dependencies, monaco-editor, @monaco-editor/react, next, node-sql-parser, react, react-dom, sql.js

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, metadata, notoThai, viewport

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): code:bash (npm run dev), Deploy on Vercel, Getting Started, Learn More

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): compilerOptions, paths, @/*

### Community 16 - "Community 16"
Cohesion: 0.60
Nodes (4): DATASETS, init(), readSchema(), register()

## Knowledge Gaps
- **66 isolated node(s):** `@/*`, `regions`, `nextConfig`, `name`, `version` (+61 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runQuery()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `@/*`, `regions`, `nextConfig` to the rest of the system?**
  _66 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12807881773399016 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._