\paragraph{Two-Tier Measurement Approach}
\hfill \break Recognising that enterprises rarely have uniform access to all platforms under consideration, each criterion specifies both an empirical testing method and an alternative data source. Empirical testing remains the preferred approach, employing direct measurement through testnet deployment, API testing, or controlled experiments. Where such testing proves infeasible due to access restrictions or the nature of the criterion itself, the framework provides structured alternatives using publicly available documentation, audit reports, and verifiable third-party assessments.

This dual approach addresses a fundamental limitation of existing frameworks that assume either complete platform access or rely entirely on vendor-provided documentation. By explicitly defining both measurement paths, the framework ensures comprehensive evaluation regardless of access constraints.

\paragraph{Measurement Specification}
\hfill \break Table \ref{tab:eval-criteria-measurement-final} presents the complete specification of all twenty evaluation criteria distributed across the five domains. For each criterion, the table defines the measurement concept, specifies the unit or scale, provides the empirical testing formula or protocol, and identifies alternative data sources. This structured presentation ensures reproducible evaluation whilst maintaining the flexibility necessary for real-world enterprise assessment scenarios.




% keep the table aligned with the text block
\setlength{\LTleft}{0pt}
\setlength{\LTright}{0pt}

\begingroup
\scriptsize
\setlength{\tabcolsep}{2pt}
\renewcommand{\arraystretch}{1.1}

\begin{longtable}{|P{1.9cm}|P{2.9cm}|P{1.7cm}|P{4.7cm}|P{3.6cm}|}
\caption{Evaluation Criteria Measurement Specifications}
\label{tab:eval-criteria-measurement-final}\\
\hline
\textbf{Domain} & \textbf{Criterion} & \textbf{Unit/Scale} &
\textbf{Empirical Testing Method} & \textbf{Alternative Data Source} \\
\hline
\endfirsthead
\hline
\textbf{Domain} & \textbf{Criterion} & \textbf{Unit/Scale} &
\textbf{Empirical Testing Method} & \textbf{Alternative Data Source} \\
\hline
\endhead
\hline
\multicolumn{5}{r}{\small\emph{Continued on next page}}\\
\hline
\endfoot
\hline
\endlastfoot

% ===== Security Robustness =====
\multicolumn{5}{|l|}{\textbf{Security Robustness}}\\ \hline
\multirow[t]{5}{*}{}
 & Formal Verification Coverage & \% (0--100) &
(Verified critical components / Total critical components) $\times$ 100 &
Formal verification reports; whitepapers \\ \cline{2-5}
 & Cryptographic Robustness & \% critical fixed &
Verify existence of $\ge$1 independent audit and compute \% of critical findings remediated &
Official audit reports; vendor disclosures \\ \cline{2-5}
 & HSM/KMS Support & Binary (Y/N) &
Attempt key creation/sign using supported KMS/HSM in a test tenant &
Integration catalogues; security architecture docs \\ \cline{2-5}
 & Byzantine Fault Tolerance & Binary (Y/N) + documented $f$ &
Increase the number of faulty validators stepwise until the system stops making progress; record the maximum tolerated (= f)&
Protocol specs; academic analyses; security whitepapers \\ \cline{2-5}
 & Vulnerability Assessment Coverage & Findings / 10\,KLOC &
Normalise latest audit/scan findings to per 10\,KLOC; report overall rate &
Public audits; SAST/DAST outputs; bug-bounty reports \\ \hline

% ===== Regulatory Compliance =====
\multicolumn{5}{|l|}{\textbf{Regulatory Compliance}}\\ \hline
\multirow[t]{5}{*}{}
 & Atomicity Enforcement & \% atomic (of 50) &
Run 50 cross-ledger/system transfers; report \% that commit atomically end-to-end &
Protocol specs; third-party validations \\ \cline{2-5}
 & Identity \& Access Management & Binary (Y/N) &
Configure SSO (SAML/OIDC) and role-based access with at least one restricted role; verify policy enforcement on a test account &
IAM docs; admin UI \\ \cline{2-5}
 & Logging \& Monitoring & Checklist score \% &
Score 5 audit-grade items working: immutable activity logs, correlatable IDs, SIEM export, retention controls, alerting on policy breaches &
Product docs; audit mappings; SIEM integration guides \\ \cline{2-5}
 & Data Sovereignty Controls & Regions (count) &
Deploy to available regions and verify policy-based residency enforcement for data and logs &
Product docs; admin console \\ \cline{2-5}
 & Certifications Coverage & \% of required set &
Define required set (e.g., SOC~2, ISO~27001); compute coverage \% &
Certificates; auditor letters; trust centre \\ \hline

% ===== Performance Characteristics =====
\multicolumn{5}{|l|}{\textbf{Performance Characteristics}}\\ \hline
\multirow[t]{3}{*}{}
 & Cross-chain Transaction Latency & ms (P95) &
Execute $\ge$100 cross-ledger transactions under nominal load; record client-observed P95 end-to-end latency &
Independent benchmarks; case studies \\ \cline{2-5}
 & Throughput Scalability & TPS (stable) &
Open-loop load for 600\,s; report stable TPS with $<$1\% error and note the knee point where errors/latency rise &
Benchmark reports; prior studies \\ \cline{2-5}
 & System Availability & \% over window &
Measure observed availability over a 30-day window in test; or extract documented SLA target if empirical is infeasible &
SLA documents; status pages; incident histories \\ \hline

% ===== Operational Reliability =====
\multicolumn{5}{|l|}{\textbf{Operational Reliability}}\\ \hline
\multirow[t]{3}{*}{}
 & Observability Readiness & Checklist score \% &
Score 5 items present/working: logs, metrics, traces, dashboards, alerts (integrated with enterprise tooling) &
Docs; SIEM/monitoring guides \\ \cline{2-5}
 & Fault Recovery Capabilities & Seconds (MTTR) &
Kill one node; time to healthy cluster (mean of $\ge$3 trials); record automated versus manual steps &
Runbooks; incident reports \\ \cline{2-5}
 & Lifecycle Management Process & Checklist score \% &
Score 5 items: documented upgrade runbook, rollback plan, backward-compatibility tests, staged/canary support, defined maintenance windows &
Release notes; change-management docs; operations manuals \\ \hline

% ===== Economic Factors =====
\multicolumn{5}{|l|}{\textbf{Economic Factors}}\\ \hline
\multirow[t]{4}{*}{}
 & Pricing Transparency & Binary (Y/N) &
Confirm public pricing/tier details accessible without sales mediation &
Pricing pages; terms \\ \cline{2-5}
 & 1-Year TCO (reference workload) & \pounds{}/year &
Compute licence + infrastructure + support for Appendix~\ref{app:workload-profile} workload &
Official calculators; quotes \\ \cline{2-5}
 & Cost per 1{,}000 Transactions & \pounds{}/kTX &
Measure cost at reference load and divide by transaction volume &
Pricing pages; prior studies \\ \cline{2-5}
 & Support \& SLA Coverage & Tiers (count) &
Catalogue available support tiers with documented response targets; count distinct tiers &
SLA documents; support catalogues \\ \cline{2-5}

\end{longtable}
\endgroup

