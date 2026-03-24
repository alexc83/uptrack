package com.ccruce.backend.dto.response;

import java.util.List;

public record CEReportResponseDto(
        CEReportCredentialDto credential,
        CEReportSummaryDto summary,
        List<CEReportRecordDto> records
) {
}
