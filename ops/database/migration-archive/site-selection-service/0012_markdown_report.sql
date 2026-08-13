ALTER TABLE site_analysis_report
  CHANGE COLUMN report_summary report_content MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '最终 Markdown 报告正文，唯一正文来源',
  CHANGE COLUMN report_json structured_json MEDIUMTEXT NULL COMMENT '可选结构化数据，MVP 固定为空',
  ADD COLUMN pdf_url VARCHAR(2048) NULL COMMENT '最近一次按需导出的 PDF OSS URL' AFTER structured_json;
