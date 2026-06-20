package com.ticketbox.module.admin.infrastructure.batch;

import com.ticketbox.module.admin.domain.GuestList;
import com.ticketbox.module.admin.domain.GuestListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.Step;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.Chunk;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.file.FlatFileItemReader;
import org.springframework.batch.item.file.mapping.DefaultLineMapper;
import org.springframework.batch.item.file.mapping.FieldSetMapper;
import org.springframework.batch.item.file.transform.DelimitedLineTokenizer;
import org.springframework.batch.item.file.transform.FieldSet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.transaction.PlatformTransactionManager;

import java.io.File;

@Configuration
@RequiredArgsConstructor
public class GuestListBatchConfig {

    private final GuestListRepository guestListRepository;
    private final GuestListProcessor guestListProcessor;
    private final BatchTrackingListener batchTrackingListener;

    @Bean
    @StepScope
    public FlatFileItemReader<GuestListRow> guestListReader(
            @Value("#{jobParameters['filePath']}") String filePath
    ) {
        FlatFileItemReader<GuestListRow> reader = new FlatFileItemReader<>();
        reader.setResource(new FileSystemResource(new File(filePath)));
        reader.setLinesToSkip(1); // Skip header line

        DefaultLineMapper<GuestListRow> lineMapper = new DefaultLineMapper<>();
        DelimitedLineTokenizer tokenizer = new DelimitedLineTokenizer();
        tokenizer.setDelimiter(",");
        tokenizer.setStrict(false);

        lineMapper.setLineTokenizer(tokenizer);
        lineMapper.setFieldSetMapper(new FieldSetMapper<GuestListRow>() {
            @Override
            public GuestListRow mapFieldSet(FieldSet fieldSet) {
                GuestListRow row = new GuestListRow();
                int count = fieldSet.getFieldCount();
                if (count >= 6) {
                    row.setConcertId(fieldSet.readString(0));
                    row.setPhone(fieldSet.readString(1));
                    row.setFullName(fieldSet.readString(2));
                    row.setCategory(fieldSet.readString(3));
                    row.setSponsorName(fieldSet.readString(4));
                    row.setNotes(fieldSet.readString(5));
                } else if (count == 5) {
                    row.setPhone(fieldSet.readString(0));
                    row.setFullName(fieldSet.readString(1));
                    row.setCategory(fieldSet.readString(2));
                    row.setSponsorName(fieldSet.readString(3));
                    row.setNotes(fieldSet.readString(4));
                } else if (count > 0) {
                    // Try mapping whatever fields exist
                    row.setPhone(fieldSet.readString(0));
                    if (count > 1) row.setFullName(fieldSet.readString(1));
                    if (count > 2) row.setCategory(fieldSet.readString(2));
                    if (count > 3) row.setSponsorName(fieldSet.readString(3));
                    if (count > 4) row.setNotes(fieldSet.readString(4));
                }
                return row;
            }
        });

        reader.setLineMapper(lineMapper);
        return reader;
    }

    @Bean
    public ItemWriter<GuestList> guestListItemWriter() {
        return new ItemWriter<GuestList>() {
            @Override
            public void write(Chunk<? extends GuestList> chunk) throws Exception {
                guestListRepository.saveAll(chunk.getItems());
            }
        };
    }

    @Bean
    public Step importGuestListStep(
            JobRepository jobRepository,
            PlatformTransactionManager transactionManager,
            FlatFileItemReader<GuestListRow> guestListReader
    ) {
        return new StepBuilder("importGuestListStep", jobRepository)
                .<GuestListRow, GuestList>chunk(50, transactionManager)
                .reader(guestListReader)
                .processor(guestListProcessor)
                .writer(guestListItemWriter())
                .faultTolerant()
                .skip(Exception.class)
                .skipLimit(100) // allow up to 100 invalid rows without failing the entire job
                .listener((org.springframework.batch.core.SkipListener<GuestListRow, GuestList>) batchTrackingListener)
                .listener((org.springframework.batch.core.ItemWriteListener<GuestList>) batchTrackingListener)
                .build();
    }

    @Bean
    public Job importGuestListJob(
            JobRepository jobRepository,
            Step importGuestListStep
    ) {
        return new JobBuilder("importGuestListJob", jobRepository)
                .start(importGuestListStep)
                .build();
    }
}
