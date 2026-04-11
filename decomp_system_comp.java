/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.apache.commons.collections4.CollectionUtils
 *  org.apache.commons.lang3.EnumUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.stereotype.Component
 *  org.springframework.web.bind.annotation.RequestMethod
 *  org.springframework.web.method.HandlerMethod
 *  org.springframework.web.servlet.mvc.method.RequestMappingInfo
 *  org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping
 */
package com.linktera.rpadashboard.component.impl;

import biz.linktera.rpadashboard.controller.StatusController;
import biz.linktera.rpadashboard.controller.SuperAdminController;
import biz.linktera.rpadashboard.service.ColumnsService;
import biz.linktera.rpadashboard.service.TablesService;
import com.linktera.rpadashboard.annotation.AppController;
import com.linktera.rpadashboard.common.Operation;
import com.linktera.rpadashboard.common.Table;
import com.linktera.rpadashboard.component.Logger;
import com.linktera.rpadashboard.component.Property;
import com.linktera.rpadashboard.component.System;
import com.linktera.rpadashboard.consumer.OptionalConsumer;
import com.linktera.rpadashboard.criteria.SearchCriteria;
import com.linktera.rpadashboard.dto.AppColumnsDto;
import com.linktera.rpadashboard.dto.AppOperationsDto;
import com.linktera.rpadashboard.dto.AppParametersDto;
import com.linktera.rpadashboard.dto.AppTablesDto;
import com.linktera.rpadashboard.dto.base.BaseDto;
import com.linktera.rpadashboard.enums.Environment;
import com.linktera.rpadashboard.enums.Parameters;
import com.linktera.rpadashboard.enums.Status;
import com.linktera.rpadashboard.enums.SubTables;
import com.linktera.rpadashboard.service.AppOperationsService;
import com.linktera.rpadashboard.service.AppParametersService;
import com.linktera.rpadashboard.util.CustomUtil;
import com.linktera.rpadashboard.util.DateUtil;
import com.linktera.rpadashboard.util.ListUtil;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.PostConstruct;
import javax.sql.DataSource;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@Component
public class SystemImpl
implements System {
    @Autowired
    Property property;
    @Autowired
    DataSource dataSource;
    @Autowired
    Logger logger;
    @Autowired
    RequestMappingHandlerMapping requestMappingHandlerMapping;
    @Autowired
    AppOperationsService appOperationsService;
    @Autowired
    AppParametersService appParametersService;
    @Autowired
    TablesService tablesService;
    @Autowired
    ColumnsService columnsService;
    private List<Table> tableList = new ArrayList<Table>();
    private List<Operation> operationList = new ArrayList<Operation>();
    private static final Long userId = 1L;

    @PostConstruct
    public void postConstruct() {
        this.organizeTables();
        this.organizeParameters();
        if (!StringUtils.equals((CharSequence)Environment.PRETEST.name(), (CharSequence)this.property.getEnvironment())) {
            this.fillOperations();
        }
    }

    @Override
    public List<Table> getTables() {
        return this.tableList;
    }

    @Override
    public List<Operation> getOperations() {
        return this.operationList;
    }

    private void organizeTables() {
        try (Connection connection = this.dataSource.getConnection();){
            List<String> metaColumns = CustomUtil.metadata();
            metaColumns.addAll(CustomUtil.bufferColumns());
            ArrayList<SearchCriteria> criteria = new ArrayList<SearchCriteria>();
            criteria.add(new SearchCriteria("status", "=", Status.ACTIVE.getCode()));
            List<AppTablesDto> inDbTables = this.tablesService.findByCriteria(criteria);
            Map<Long, List<AppColumnsDto>> inDbColumnsMap = CollectionUtils.emptyIfNull(this.columnsService.findByCriteria(criteria)).stream().collect(Collectors.groupingBy(AppColumnsDto::getTableId));
            DatabaseMetaData metaData = connection.getMetaData();
            ResultSet tables = metaData.getTables(null, this.property.getDefaultSchema(), "%", new String[]{"TABLE"});
            while (tables.next()) {
                String tableName = tables.getString("TABLE_NAME");
                if (Stream.of("LIQ", "TMP").anyMatch(tableName::startsWith)) continue;
                AppTablesDto appTablesDto = null;
                if (EnumUtils.isValidEnumIgnoreCase(SubTables.class, (String)tableName) && inDbColumnsMap.containsKey((appTablesDto = CollectionUtils.emptyIfNull(inDbTables).stream().filter(t -> tableName.equals(t.getName())).findFirst().orElseGet(() -> {
                    AppTablesDto dto = new AppTablesDto();
                    dto.setName(tableName);
                    this.setCredential(dto);
                    return this.tablesService.save(dto);
                })).getId())) {
                    appTablesDto.setColumns(inDbColumnsMap.get(appTablesDto.getId()));
                    inDbColumnsMap.remove(appTablesDto.getId());
                }
                ArrayList<AppColumnsDto> columnList = new ArrayList<AppColumnsDto>();
                ResultSet columns = metaData.getColumns(null, this.property.getDefaultSchema(), tableName, "%");
                while (columns.next()) {
                    AppColumnsDto appColumnsDto = new AppColumnsDto();
                    appColumnsDto.setName(columns.getString("COLUMN_NAME"));
                    appColumnsDto.setDataSize(columns.getInt("COLUMN_SIZE"));
                    appColumnsDto.setDataType(columns.getInt("DATA_TYPE"));
                    if (!metaColumns.contains(CustomUtil.toLowerCamel(appColumnsDto.getName()))) {
                        Optional.ofNullable(appTablesDto).ifPresent(t -> OptionalConsumer.of(t.getColumns().stream().filter(c -> c.getName().equals(appColumnsDto.getName())).findFirst()).ifPresent(c -> t.getColumns().remove(c)).ifNotPresent(() -> {
                            this.setCredential(appColumnsDto);
                            appColumnsDto.setTableId(t.getId());
                            appColumnsDto.setTableName(t.getName());
                            this.columnsService.save(appColumnsDto);
                        }));
                    }
                    StringBuilder sb = new StringBuilder();
                    sb.append(columns.getString("TYPE_NAME")).append("(");
                    sb.append(columns.getString("COLUMN_SIZE"));
                    Optional.ofNullable(columns.getString("DECIMAL_DIGITS")).filter(StringUtils::isNotEmpty).ifPresent(decimalDigits -> sb.append(",").append((String)decimalDigits));
                    sb.append(")");
                    if (!columns.getBoolean("IS_NULLABLE")) {
                        sb.append(" ").append("NOT NULL");
                    }
                    appColumnsDto.setType(sb.toString());
                    columnList.add(appColumnsDto);
                }
                Optional.ofNullable(appTablesDto).ifPresent(t -> t.getColumns().forEach(c -> this.columnsService.delete(c.getUuid())));
                inDbTables.remove(appTablesDto);
                this.tableList.add(new Table(tableName, columnList));
            }
            inDbTables.forEach(t -> this.tablesService.delete(t.getUuid()));
            inDbColumnsMap.values().forEach(cs -> cs.forEach(c -> this.columnsService.delete(c.getUuid())));
        }
        catch (Exception ex) {
            this.logger.fatal(ex);
        }
    }

    private void organizeParameters() {
        Arrays.stream(Parameters.values()).map(Enum::name).forEach(parameter -> OptionalConsumer.of(Optional.ofNullable(this.appParametersService.findByKey((String)parameter))).ifPresent(dto -> {
            if (dto.getStatus() != Status.ACTIVE.getCode()) {
                dto.setStatus(Status.ACTIVE.getCode());
                this.appParametersService.update(dto.getUuid(), dto);
            }
        }).ifNotPresent(() -> {
            AppParametersDto dto = new AppParametersDto();
            this.setCredential(dto);
            dto.setKey((String)parameter);
            this.appParametersService.save(dto);
        }));
    }

    private void fillOperations() {
        List<Table> tables = this.getTables();
        List<AppOperationsDto> dtoList = this.appOperationsService.getOperationList(Status.ACTIVE);
        for (Map.Entry item : this.requestMappingHandlerMapping.getHandlerMethods().entrySet()) {
            RequestMappingInfo mapping = (RequestMappingInfo)item.getKey();
            HandlerMethod method = (HandlerMethod)item.getValue();
            Class controller = method.getBeanType();
            if (mapping.getMethodsCondition().getMethods().size() != 1 || mapping.getPatternsCondition().getPatterns().size() != 1) continue;
            String requestMethod = ((RequestMethod)mapping.getMethodsCondition().getMethods().toArray()[0]).name();
            String requestPath = (String)mapping.getPatternsCondition().getPatterns().toArray()[0];
            if (!StringUtils.isNotEmpty((CharSequence)requestMethod) || !StringUtils.isNotEmpty((CharSequence)requestPath)) continue;
            Operation operation = new Operation();
            operation.setMethod(requestMethod);
            operation.setPath(requestPath);
            if (controller.isAnnotationPresent(AppController.class)) {
                AppController annotation = controller.getAnnotation(AppController.class);
                operation.setTable(tables.stream().filter(table -> table.getName().equals(annotation.table())).findFirst().orElse(null));
                operation.setService(annotation.service());
            }
            if (!SuperAdminController.class.isAssignableFrom(controller) && !StatusController.class.isAssignableFrom(controller) && (ListUtil.isEmpty(dtoList) || dtoList.stream().noneMatch(dto -> StringUtils.equals((CharSequence)operation.getMethod(), (CharSequence)dto.getMethod()) && StringUtils.equals((CharSequence)operation.getPath(), (CharSequence)dto.getPath())))) {
                AppOperationsDto dto2 = new AppOperationsDto();
                this.setCredential(dto2);
                dto2.setMethod(operation.getMethod());
                dto2.setPath(operation.getPath());
                dto2.setDescription(null);
                dto2.setIsSideMenu(1);
                this.appOperationsService.save(dto2);
            }
            this.operationList.add(operation);
        }
        dtoList.stream().filter(dto -> dto.getPath().startsWith("/v1/sa") || dto.getPath().equals("/status") || this.operationList.stream().noneMatch(operation -> operation.getMethod().equals(dto.getMethod()) && operation.getPath().equals(dto.getPath()))).map(BaseDto::getUuid).forEach(this.appOperationsService::delete);
    }

    private <D extends BaseDto> void setCredential(D d) {
        Date now = DateUtil.newDateTime();
        d.setCreatedBy(userId);
        d.setCreatedTime(now);
        d.setLastUpdatedBy(userId);
        d.setLastUpdatedTime(now);
    }
}
