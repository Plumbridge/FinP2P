// FinP2P Regulatory Compliance Benchmark Runner
// This script runs the regulatory compliance benchmark and generates results

const { FinP2PRegulatoryComplianceBenchmark } = require('../../../dist/results/finp2p/regulatory-compliance/finp2p-regulatory-compliance-benchmark');
const fs = require('fs');
const path = require('path');

async function runBenchmark() {
  console.log('🏛️ Starting FinP2P Regulatory Compliance Benchmark');
  console.log('================================================');
  
  const benchmark = new FinP2PRegulatoryComplianceBenchmark();
  
  // Set up event listeners
  benchmark.on('progress', ({ message }) => {
    console.log(message);
  });
  
  try {
    // Run the benchmark
    const results = await benchmark.runBenchmark();
    
    // Generate output directory
    const outputDir = path.join(__dirname);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save JSON results
    const jsonPath = path.join(outputDir, 'finp2p-regulatory-compliance-benchmark-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 JSON results saved to: ${jsonPath}`);
    
    // Generate Markdown report
    const markdownReport = generateMarkdownReport(results);
    const mdPath = path.join(outputDir, 'finp2p-regulatory-compliance-benchmark-results.md');
    fs.writeFileSync(mdPath, markdownReport);
    console.log(`📄 Markdown report saved to: ${mdPath}`);
    
    // Display summary
    console.log('\n📊 REGULATORY COMPLIANCE SUMMARY');
    console.log('================================');
    console.log(`Overall Score: ${results.overallScore.toFixed(2)}%`);
    console.log(`Status: ${results.status}`);
    console.log(`Duration: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`Tests Completed: ${results.criteria.length}`);
    
    console.log('\n📋 Test Results:');
    results.criteria.forEach((criterion, index) => {
      const status = criterion.status === 'PASSED' ? '✅' : criterion.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`  ${index + 1}. ${criterion.testName}: ${status} ${criterion.score.toFixed(2)}%`);
    });
    
    console.log('\n🎉 Benchmark completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

function generateMarkdownReport(results) {
  const timestamp = new Date(results.testDate).toLocaleString();
  
  let report = `# FinP2P Regulatory Compliance Benchmark Results\n\n`;
  report += `**Test Date:** ${timestamp}\n`;
  report += `**Duration:** ${(results.duration / 1000).toFixed(2)}s\n`;
  report += `**Overall Score:** ${results.overallScore.toFixed(2)}%\n`;
  report += `**Status:** ${results.status}\n`;
  report += `**Network:** ${results.technicalDetails.network}\n\n`;
  
  report += `## Executive Summary\n\n`;
  report += `The FinP2P system was tested against 5 critical regulatory compliance criteria. `;
  report += `The overall compliance score of ${results.overallScore.toFixed(2)}% indicates `;
  
  if (results.overallScore >= 90) {
    report += `excellent regulatory compliance with the system meeting or exceeding industry standards.\n\n`;
  } else if (results.overallScore >= 80) {
    report += `good regulatory compliance with minor areas for improvement.\n\n`;
  } else if (results.overallScore >= 70) {
    report += `acceptable regulatory compliance with notable gaps that should be addressed.\n\n`;
  } else {
    report += `poor regulatory compliance requiring immediate attention and remediation.\n\n`;
  }
  
  report += `## Test Results\n\n`;
  
  results.criteria.forEach((criterion, index) => {
    const status = criterion.status === 'PASSED' ? '✅ PASSED' : criterion.status === 'FAILED' ? '❌ FAILED' : '⚠️ SKIPPED';
    
    report += `### ${index + 1}. ${criterion.testName} - ${status}\n\n`;
    report += `**Score:** ${criterion.score.toFixed(2)}%\n\n`;
    report += `**Description:** ${criterion.details.description}\n\n`;
    
    if (criterion.metrics) {
      report += `**Metrics:**\n`;
      report += `- Total Tests: ${criterion.metrics.totalTests}\n`;
      report += `- Passed: ${criterion.metrics.passedTests}\n`;
      report += `- Failed: ${criterion.metrics.failedTests}\n`;
      report += `- Skipped: ${criterion.metrics.skippedTests}\n`;
      report += `- Details: ${criterion.metrics.details}\n\n`;
    }
    
    if (criterion.details && Object.keys(criterion.details).length > 2) {
      report += `**Key Findings:**\n`;
      Object.entries(criterion.details).forEach(([key, value]) => {
        if (key !== 'description' && typeof value !== 'object') {
          report += `- ${key}: ${value}\n`;
        }
      });
      report += `\n`;
    }
  });
  
  report += `## Technical Details\n\n`;
  report += `- **Network:** ${results.technicalDetails.network}\n`;
  report += `- **SDK:** ${results.technicalDetails.sdk}\n`;
  report += `- **Test Type:** ${results.technicalDetails.testType}\n`;
  report += `- **Data Collection:** ${results.technicalDetails.dataCollection}\n\n`;
  
  report += `## Evidence Collected\n\n`;
  report += `- **Logs Collected:** ${results.evidence.logsCollected}\n`;
  report += `- **Metrics Collected:** ${results.evidence.metricsCollected}\n`;
  report += `- **Traces Collected:** ${results.evidence.tracesCollected}\n\n`;
  
  report += `## Methodology\n\n`;
  Object.entries(results.methodology).forEach(([test, description]) => {
    report += `- **${test}:** ${description}\n`;
  });
  
  report += `\n---\n`;
  report += `*Report generated by FinP2P Regulatory Compliance Benchmark v1.0*\n`;
  
  return report;
}

// Run the benchmark
runBenchmark().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
