package com.ccruce.backend.service;

import com.ccruce.backend.dto.request.CERecordRequestDto;
import com.ccruce.backend.dto.response.CERecordResponseDto;

import java.util.List;
import java.util.UUID;

public interface CERecordService {

    CERecordResponseDto createCERecord(CERecordRequestDto requestDto);

    List<CERecordResponseDto> getAllCERecords();

    CERecordResponseDto getCERecordById(UUID id);

    CERecordResponseDto updateCERecord(UUID id, CERecordRequestDto requestDto);

    void deleteCERecord(UUID id);
}
