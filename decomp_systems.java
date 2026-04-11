/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.EntityManager
 *  javax.persistence.PersistenceContext
 *  javax.persistence.Query
 *  org.apache.commons.lang3.EnumUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.reflect.FieldUtils
 *  org.apache.logging.log4j.util.Strings
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.ApplicationContext
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Service
 */
package biz.linktera.rpadashboard.service.impl;

import biz.linktera.rpadashboard.service.SubsidiaryService;
import biz.linktera.rpadashboard.service.SystemsService;
import com.linktera.rpadashboard.common.Operation;
import com.linktera.rpadashboard.common.Report;
import com.linktera.rpadashboard.common.Table;
import com.linktera.rpadashboard.component.Logger;
import com.linktera.rpadashboard.component.Property;
import com.linktera.rpadashboard.component.Session;
import com.linktera.rpadashboard.component.System;
import com.linktera.rpadashboard.criteria.SearchCriteria;
import com.linktera.rpadashboard.dto.AppColumnsDto;
import com.linktera.rpadashboard.dto.AppQueryParamsDto;
import com.linktera.rpadashboard.dto.AppSubsidiaryDto;
import com.linktera.rpadashboard.dto.AppUsersDto;
import com.linktera.rpadashboard.dto.base.BaseDto;
import com.linktera.rpadashboard.enums.Error;
import com.linktera.rpadashboard.enums.Status;
import com.linktera.rpadashboard.enums.SubTables;
import com.linktera.rpadashboard.exception.GeneralException;
import com.linktera.rpadashboard.exception.ValidationException;
import com.linktera.rpadashboard.request.base.BaseRequest;
import com.linktera.rpadashboard.service.AppUsersService;
import com.linktera.rpadashboard.service.base.BaseService;
import com.linktera.rpadashboard.util.ClassUtil;
import com.linktera.rpadashboard.util.CustomUtil;
import com.linktera.rpadashboard.util.DateUtil;
import com.linktera.rpadashboard.util.ListUtil;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.logging.log4j.util.Strings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SystemsServiceImpl
implements SystemsService {
    @Autowired
    Property property;
    @Autowired
    Session session;
    @Autowired
    ApplicationContext context;
    @Autowired
    System system;
    @Autowired
    SubsidiaryService subsidiaryService;
    @Autowired
    Logger logger;
    @Autowired
    AppUsersService appUsersService;
    @PersistenceContext
    private EntityManager em;

    @Override
    public List<Table> getTables() {
        return this.system.getTables();
    }

    @Override
    public List<Operation> getOperations() {
        return this.system.getOperations();
    }

    @Override
    public Operation findOperationByTableAndColumn(String table, String column) {
        return this.getOperations().stream().filter(o -> Objects.nonNull(o.getTable()) && StringUtils.equals((CharSequence)o.getTable().getName(), (CharSequence)table) && o.getTable().getColumns().stream().anyMatch(col -> StringUtils.equals((CharSequence)col.getName(), (CharSequence)column))).findFirst().orElse(null);
    }

    @Override
    public Operation findOperationByMethodAndPath(String method, String path) {
        return this.getOperations().stream().filter(o -> Objects.nonNull(o.getTable()) && (method == null || StringUtils.equals((CharSequence)o.getMethod(), (CharSequence)method)) && StringUtils.equals((CharSequence)o.getPath(), (CharSequence)path)).findFirst().orElse(null);
    }

    @Override
    public Operation getCurrentOperation() {
        return this.findOperationByMethodAndPath(this.session.getRequestMethod(), this.session.getRequestPath());
    }

    @Override
    public List<SearchCriteria> organizeReportCriteria(Operation operation, Report report) {
        ArrayList<SearchCriteria> criteria = new ArrayList<SearchCriteria>();
        criteria.add(new SearchCriteria(CustomUtil.toLowerCamel("ORGANIZATION_ID"), "=", this.property.getOrganizationId()));
        criteria.add(new SearchCriteria(CustomUtil.toLowerCamel("STATUS"), "=", Status.ACTIVE.getCode()));
        Optional.ofNullable(report).ifPresent(r -> {
            List<AppColumnsDto> columns = operation.getTable().getColumns();
            if (columns.stream().anyMatch(column -> "SUBSIDIARY_CODE".equals(column.getName())) && report.getSubsidiary() != null && Strings.isNotBlank((String)report.getSubsidiary().getSubsidiaryCode())) {
                criteria.add(new SearchCriteria(CustomUtil.toLowerCamel("SUBSIDIARY_CODE"), "=", report.getSubsidiary().getSubsidiaryCode()));
            }
            if (columns.stream().anyMatch(column -> "REPORT_DATE".equals(column.getName())) && report.getReportDate() != null) {
                criteria.add(new SearchCriteria(CustomUtil.toLowerCamel("REPORT_DATE"), "=", report.getReportDate()));
            }
            if (columns.stream().anyMatch(column -> "REPORT_TYPE".equals(column.getName())) && Strings.isNotBlank((String)report.getReportType())) {
                criteria.add(new SearchCriteria(CustomUtil.toLowerCamel("REPORT_TYPE"), "=", report.getReportType()));
            }
        });
        return criteria;
    }

    @Override
    public Report getReportFromRequest(BaseRequest<?> req) {
        Report report = new Report();
        Operation operation = this.getCurrentOperation();
        if (operation == null || operation.getService() == null || req.get() == null && ListUtil.isEmpty(req.getList())) {
            return report;
        }
        report.setSubsidiary(this.getSubsidiary());
        if (EnumUtils.isValidEnum(SubTables.class, (String)operation.getTable().getName())) {
            BaseRequest<?> object;
            Date reportDate;
            Object oUuid;
            BaseRequest<Object> inDb = null;
            if (req.get() != null && (oUuid = ClassUtil.getFieldValue(FieldUtils.getField(req.get().getClass(), (String)CustomUtil.toLowerCamel("UUID"), (boolean)true), req.get(), true)) instanceof UUID) {
                inDb = ((BaseService)this.context.getBean(operation.getService())).get(UUID.fromString(String.valueOf(oUuid)));
            }
            if ((reportDate = this.getReportDate(object = inDb instanceof BaseDto ? inDb : req)) == null) {
                throw new GeneralException(HttpStatus.BAD_REQUEST.value(), "Report date cannot be empty");
            }
            report.setReportDate(reportDate);
            String reportType = this.getReportType(object);
            if (Strings.isBlank((String)reportType)) {
                throw new GeneralException(HttpStatus.BAD_REQUEST.value(), "Report type cannot be empty");
            }
            report.setReportType(reportType);
            report.setBatchId(this.getBatchId(object));
        }
        return report;
    }

    public AppSubsidiaryDto getSubsidiary() {
        return Optional.ofNullable(this.session.getSessionUser()).map(appUsersDto -> (AppSubsidiaryDto)this.subsidiaryService.get(this.subsidiaryService.lookup(appUsersDto.getSubsidiaryId()))).orElse(null);
    }

    private Date getReportDate(Object object) {
        Date date = null;
        Field fReportDate = FieldUtils.getField(object.getClass(), (String)CustomUtil.toLowerCamel("REPORT_DATE"), (boolean)true);
        Object oReportDate = ClassUtil.getFieldValue(fReportDate, object, true);
        if (object instanceof BaseRequest) {
            BaseRequest request = (BaseRequest)object;
            if (oReportDate == null && request.get() != null) {
                fReportDate = FieldUtils.getField(request.get().getClass(), (String)CustomUtil.toLowerCamel("REPORT_DATE"), (boolean)true);
                oReportDate = ClassUtil.getFieldValue(fReportDate, request.get(), true);
            }
        }
        if (oReportDate instanceof Date) {
            date = (Date)oReportDate;
        }
        return date;
    }

    private String getReportType(Object object) {
        BaseRequest request;
        Field fReportType = FieldUtils.getField(object.getClass(), (String)CustomUtil.toLowerCamel("REPORT_TYPE"), (boolean)true);
        Object oReportType = ClassUtil.getFieldValue(fReportType, object, true);
        if ((oReportType == null || Strings.isBlank((String)String.valueOf(oReportType))) && object instanceof BaseRequest && (request = (BaseRequest)object).get() != null) {
            fReportType = FieldUtils.getField(request.get().getClass(), (String)CustomUtil.toLowerCamel("REPORT_TYPE"), (boolean)true);
            oReportType = ClassUtil.getFieldValue(fReportType, request.get(), true);
        }
        return oReportType != null && Strings.isNotBlank((String)String.valueOf(oReportType)) ? String.valueOf(oReportType) : null;
    }

    private UUID getBatchId(Object object) {
        BaseRequest request;
        Field fBatchId = FieldUtils.getField(object.getClass(), (String)"batchId", (boolean)true);
        Object oBatchId = ClassUtil.getFieldValue(fBatchId, object, true);
        if (oBatchId == null && object instanceof BaseRequest && (fBatchId = FieldUtils.getField((request = (BaseRequest)object).get().getClass(), (String)CustomUtil.toLowerCamel("batchId"), (boolean)true)) != null) {
            oBatchId = ClassUtil.getFieldValue(fBatchId, request.get(), true);
        }
        return oBatchId != null && Strings.isNotBlank((String)String.valueOf(oBatchId)) ? UUID.fromString(String.valueOf(oBatchId)) : null;
    }

    @Override
    public boolean isSubRequest(Report report) {
        return report != null && report.getReportDate() != null && Strings.isNotBlank((String)report.getReportType()) && report.getSubsidiary() != null;
    }

    @Override
    public void deleteFromTableByReport(String table, Long subsidiaryId, Date reportDate, String reportType) {
        Set<Object> tables = new HashSet();
        if (Strings.isBlank((String)table)) {
            tables = SubTables.getSubTables();
        } else if (EnumUtils.isValidEnum(SubTables.class, (String)table)) {
            tables = Collections.singleton(table);
        }
        AppSubsidiaryDto appSubsidiaryDto = Optional.ofNullable(this.subsidiaryService.get(this.subsidiaryService.lookup(subsidiaryId))).orElse(null);
        if (tables.isEmpty() || appSubsidiaryDto == null || reportDate == null || Strings.isBlank((String)reportType)) {
            throw new ValidationException(Error.ERR005);
        }
        Report report = new Report(appSubsidiaryDto, reportDate, reportType, null);
        try {
            tables.forEach(tableName -> {
                List<AppQueryParamsDto> appQueryParamsDtoList = CustomUtil.setQueryParamsByReport(report);
                appQueryParamsDtoList.add(new AppQueryParamsDto(CustomUtil.toLowerCamel("ORGANIZATION_ID"), this.property.getOrganizationId()));
                appQueryParamsDtoList.add(new AppQueryParamsDto(CustomUtil.toLowerCamel("STATUS"), Status.DELETED.getCode()));
                Query query = this.em.createNativeQuery(CustomUtil.deleteFromTableByReport(tableName));
                CustomUtil.setParameters(query, appQueryParamsDtoList);
                query.executeUpdate();
            });
        }
        catch (Exception e) {
            this.logger.fatal(e);
        }
    }

    @Override
    public <T extends BaseDto> List<T> setLastUpdaterName(List<T> list) {
        if (ListUtil.isNotEmpty(list)) {
            List appUsersDtoList = this.appUsersService.findByCriteria(new ArrayList<SearchCriteria>());
            list.forEach(h -> ClassUtil.setField(h, CustomUtil.toLowerCamel("LAST_UPDATER_NAME"), appUsersDtoList.stream().filter(dto -> dto.getId().equals(h.getLastUpdatedBy())).findFirst().map(appUsersDto -> appUsersDto.getName() + " " + appUsersDto.getSurname()).orElse(null)));
            list.sort(Comparator.comparing(BaseDto::getLuc).reversed());
        }
        return list;
    }

    @Override
    public <T extends BaseDto> void setBaseRequiredFields(T dto) {
        Date now = DateUtil.newDateTime();
        if (dto.getUuid() == null) {
            dto.setUuid(UUID.randomUUID());
        }
        if (dto.getOrganizationId() == null) {
            dto.setOrganizationId(this.property.getOrganizationId());
        }
        if (dto.getSubsidiaryId() == null) {
            dto.setSubsidiaryId(this.property.getSubsidiaryId());
        }
        if (dto.getCreatedTime() == null) {
            dto.setCreatedTime(now);
        }
        if (dto.getLastUpdatedTime() == null) {
            dto.setLastUpdatedTime(now);
        }
        Optional.ofNullable(this.session.getSessionUser()).map(AppUsersDto::getId).ifPresent(userId -> {
            if (dto.getCreatedBy() == null) {
                dto.setCreatedBy((Long)userId);
            }
            if (dto.getLastUpdatedBy() == null) {
                dto.setLastUpdatedBy((Long)userId);
            }
        });
    }
}
