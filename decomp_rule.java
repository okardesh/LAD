/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  javax.persistence.EntityManager
 *  javax.persistence.EntityManagerFactory
 *  javax.persistence.PersistenceUnit
 *  javax.persistence.Query
 *  javax.validation.ConstraintViolationException
 *  org.apache.commons.collections4.CollectionUtils
 *  org.apache.commons.lang3.EnumUtils
 *  org.apache.commons.lang3.StringUtils
 *  org.apache.commons.lang3.math.NumberUtils
 *  org.apache.commons.lang3.reflect.FieldUtils
 *  org.apache.logging.log4j.util.Strings
 *  org.jeasy.rules.api.Facts
 *  org.jeasy.rules.mvel.MVELRule
 *  org.modelmapper.ModelMapper
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.context.i18n.LocaleContextHolder
 *  org.springframework.expression.Expression
 *  org.springframework.expression.ExpressionParser
 *  org.springframework.expression.spel.standard.SpelExpressionParser
 *  org.springframework.http.HttpStatus
 *  org.springframework.stereotype.Component
 */
package com.linktera.rpadashboard.component.impl;

import biz.linktera.rpadashboard.service.RuleErrorsService;
import biz.linktera.rpadashboard.service.RulesService;
import biz.linktera.rpadashboard.service.SubsidiaryTablesService;
import biz.linktera.rpadashboard.service.SystemsService;
import com.linktera.rpadashboard.annotation.AppEntityType;
import com.linktera.rpadashboard.common.QueryResult;
import com.linktera.rpadashboard.common.Report;
import com.linktera.rpadashboard.component.Approval;
import com.linktera.rpadashboard.component.Condition;
import com.linktera.rpadashboard.component.Logger;
import com.linktera.rpadashboard.component.Property;
import com.linktera.rpadashboard.component.Rule;
import com.linktera.rpadashboard.component.Session;
import com.linktera.rpadashboard.component.Validator;
import com.linktera.rpadashboard.constant.PatternConstants;
import com.linktera.rpadashboard.dto.AppColumnsDto;
import com.linktera.rpadashboard.dto.AppQueryParamsDto;
import com.linktera.rpadashboard.dto.AppRuleErrorItemsDto;
import com.linktera.rpadashboard.dto.AppRuleErrorsDto;
import com.linktera.rpadashboard.dto.AppRulesDto;
import com.linktera.rpadashboard.dto.AppSubsidiaryDto;
import com.linktera.rpadashboard.enums.Error;
import com.linktera.rpadashboard.enums.Operators;
import com.linktera.rpadashboard.enums.Status;
import com.linktera.rpadashboard.enums.SubTables;
import com.linktera.rpadashboard.exception.GeneralException;
import com.linktera.rpadashboard.exception.QueryException;
import com.linktera.rpadashboard.exception.UnknownException;
import com.linktera.rpadashboard.exception.ValidationException;
import com.linktera.rpadashboard.model.AppRuleConditions;
import com.linktera.rpadashboard.model.AppRuleExpressionConditions;
import com.linktera.rpadashboard.model.AppRuleQueryConditions;
import com.linktera.rpadashboard.model.base.BaseModel;
import com.linktera.rpadashboard.request.base.BaseRequest;
import com.linktera.rpadashboard.service.AppOperationsService;
import com.linktera.rpadashboard.service.AppParametersService;
import com.linktera.rpadashboard.util.ClassUtil;
import com.linktera.rpadashboard.util.CustomUtil;
import com.linktera.rpadashboard.util.DateUtil;
import com.linktera.rpadashboard.util.ListUtil;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.PersistenceUnit;
import javax.persistence.Query;
import javax.validation.ConstraintViolationException;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.EnumUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.logging.log4j.util.Strings;
import org.jeasy.rules.api.Facts;
import org.jeasy.rules.mvel.MVELRule;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RuleImpl
implements Rule {
    @Autowired
    Property property;
    @Autowired
    Session session;
    @Autowired
    SystemsService systemsService;
    @Autowired
    RulesService rulesService;
    @Autowired
    AppOperationsService appOperationsService;
    @Autowired
    RuleErrorsService ruleErrorsService;
    @Autowired
    Condition condition;
    @Autowired
    Approval approval;
    @Autowired
    AppParametersService appParametersService;
    @Autowired
    SubsidiaryTablesService subsidiaryTablesService;
    @Autowired
    Validator validator;
    @Autowired
    Logger logger;
    @PersistenceUnit
    private EntityManagerFactory entityManagerFactory;
    private final ModelMapper modelMapper = new ModelMapper();

    @Override
    public void single(BaseRequest<?> req, Report report) {
        List<AppRulesDto> appRulesDtoList;
        if (req == null || req.get() == null) {
            return;
        }
        AppRuleErrorsDto appRuleErrorsDto = this.ruleErrorsFromReport(report);
        appRuleErrorsDto.setItems(this.validator.validate(Collections.singletonList(req.get()), report));
        if (ListUtil.isEmpty(appRuleErrorsDto.getItems()) && ListUtil.isNotEmpty(appRulesDtoList = this.getRuleList(report))) {
            ArrayList<AppRuleErrorItemsDto> items = new ArrayList<AppRuleErrorItemsDto>(this.evaluate(Collections.singletonList(req.get()), appRulesDtoList, report));
            if (this.checkHasQueryCondition(appRulesDtoList)) {
                items.addAll(this.prePostEvaluate(Collections.singletonList(req.get()), appRulesDtoList, report, false));
            }
            appRuleErrorsDto.setItems(items);
        }
        if (ListUtil.isNotEmpty(appRuleErrorsDto.getItems())) {
            this.ruleErrorsService.save(appRuleErrorsDto);
            String message = LocaleContextHolder.getLocale().toString().equals("tr") ? "<a href='/rule-error/" + appRuleErrorsDto.getUuid() + "' class='text-white' target='_blank'>" + URLEncoder.encode("Veri aktar\u0131m\u0131 ba\u015far\u0131s\u0131z. <strong>" + appRuleErrorsDto.getItems().size() + "</strong> hata mevcut. Detayl\u0131 hata raporu i\u00e7in l\u00fctfen <span style='text-decoration: underline;'>t\u0131klay\u0131n\u0131z.</span>", "UTF-8") + "</a>" : "<a href='/rule-error/" + appRuleErrorsDto.getUuid() + "' class='text-white' target='_blank'>Data transfer failed. <strong>" + appRuleErrorsDto.getItems().size() + "</strong> error exists. Please <span style='text-decoration: underline;'>click for detailed bug report.</span></a>";
            GeneralException e = new GeneralException(HttpStatus.BAD_REQUEST.value(), String.format(Error.ERR009.getError(), appRuleErrorsDto.getUuid()));
            e.initCause(new ValidationException(URLDecoder.decode(message, "ISO8859_1")));
            throw e;
        }
        this.approval.approve(req, report);
    }

    @Override
    public AppRuleErrorsDto multiple(BaseRequest<?> req, Report report) {
        List<AppRulesDto> appRulesDtoList;
        if (req == null || ListUtil.isEmpty(req.getList())) {
            return null;
        }
        AppRuleErrorsDto appRuleErrorsDto = this.ruleErrorsFromReport(report);
        appRuleErrorsDto.setItems(this.validator.validate(req.getList(), report));
        if (ListUtil.isEmpty(appRuleErrorsDto.getItems()) && ListUtil.isNotEmpty(appRulesDtoList = this.getRuleList(report))) {
            ArrayList<AppRuleErrorItemsDto> items = new ArrayList<AppRuleErrorItemsDto>(this.evaluate(req.getList(), appRulesDtoList, report));
            if (this.checkHasQueryCondition(appRulesDtoList)) {
                items.addAll(this.prePostEvaluate(new ArrayList(req.getList()), appRulesDtoList, report, true));
            }
            appRuleErrorsDto.setItems(items);
        }
        if (ListUtil.isNotEmpty(appRuleErrorsDto.getItems())) {
            this.ruleErrorsService.save(appRuleErrorsDto);
        }
        return appRuleErrorsDto;
    }

    private List<AppRuleErrorItemsDto> evaluate(List<?> objects, List<AppRulesDto> appRulesDtoList, Report report) {
        if (ListUtil.isEmpty(appRulesDtoList) || ListUtil.isEmpty(objects)) {
            return Collections.emptyList();
        }
        SpelExpressionParser expressionParser = new SpelExpressionParser();
        Facts facts = new Facts();
        facts.put("REPORT", (Object)report);
        facts.put("CONDITION", (Object)this.condition);
        facts.put("LIST", objects);
        ArrayList<AppRuleErrorItemsDto> appRuleErrorItemsDtoList = new ArrayList<AppRuleErrorItemsDto>();
        AtomicInteger index = new AtomicInteger(1);
        objects.forEach(arg_0 -> this.lambda$evaluate$3(facts, index, appRulesDtoList, appRuleErrorItemsDtoList, (ExpressionParser)expressionParser, arg_0));
        return appRuleErrorItemsDtoList;
    }

    private List<AppRuleErrorItemsDto> prePostEvaluate(List<?> objects, List<AppRulesDto> appRulesDtoList, Report report, boolean isMultiple) {
        if (ListUtil.isEmpty(objects)) {
            return Collections.emptyList();
        }
        EntityManager entityManager = this.entityManagerFactory.createEntityManager();
        entityManager.getTransaction().begin();
        ArrayList<AppRuleErrorItemsDto> appRuleErrorItemsDtoList = new ArrayList<AppRuleErrorItemsDto>();
        ArrayList validationExceptions = new ArrayList();
        ArrayList<AppQueryParamsDto> appQueryParamsDtoList = new ArrayList<AppQueryParamsDto>(CustomUtil.setQueryParamsByReport(report));
        appQueryParamsDtoList.add(new AppQueryParamsDto(CustomUtil.toLowerCamel("ORGANIZATION_ID"), this.property.getOrganizationId()));
        AppQueryParamsDto statusParam = new AppQueryParamsDto(CustomUtil.toLowerCamel("STATUS"));
        appQueryParamsDtoList.add(statusParam);
        try {
            if (isMultiple) {
                Optional.of(this.systemsService.getCurrentOperation()).filter(o -> EnumUtils.isValidEnum(SubTables.class, (String)o.getTable().getName())).ifPresent(o -> {
                    statusParam.setValue(String.valueOf(Status.DELETED.getCode()));
                    Query query = entityManager.createNativeQuery(CustomUtil.deleteFromTableByReport(o.getTable().getName()));
                    CustomUtil.setParameters(query, appQueryParamsDtoList);
                    query.executeUpdate();
                });
            }
            statusParam.setValue(String.valueOf(Status.ACTIVE.getCode()));
            AtomicInteger index = new AtomicInteger(1);
            List arr = objects.stream().map(object -> {
                int i = index.getAndIncrement();
                BaseModel o = (BaseModel)this.modelMapper.map(object, object.getClass().getAnnotation(AppEntityType.class).type());
                try {
                    if (o.getUuid() == null) {
                        o.setUuid(UUID.randomUUID());
                    }
                    if (o.getOrganizationId() == null) {
                        o.setOrganizationId(this.property.getOrganizationId());
                    }
                    entityManager.persist((Object)o);
                    entityManager.flush();
                    return o;
                }
                catch (ConstraintViolationException e) {
                    entityManager.clear();
                    e.getConstraintViolations().forEach(violation -> validationExceptions.add(i + ". Row violation: " + violation.getRootBeanClass().getSimpleName() + "::" + violation.getPropertyPath().toString() + " " + violation.getMessage()));
                    return null;
                }
            }).collect(Collectors.toList());
            if (ListUtil.isNotEmpty(validationExceptions)) {
                throw new ValidationException(String.join((CharSequence)"\n", validationExceptions));
            }
            if (arr.stream().filter(Objects::nonNull).count() != (long)objects.size()) {
                throw new UnknownException();
            }
            appRulesDtoList.forEach(appRulesDto -> CollectionUtils.emptyIfNull(appRulesDto.getQueryConditions()).stream().filter(appRuleQueryConditionsDto -> StringUtils.isNotBlank((CharSequence)appRuleQueryConditionsDto.getQuery()) && CustomUtil.isValidQuery(appRuleQueryConditionsDto.getQuery())).forEach(appRuleQueryConditionsDto -> {
                Query query = entityManager.createNativeQuery(appRuleQueryConditionsDto.getQuery().replaceAll("\\xa0", " ").replaceAll("`", "'"));
                CustomUtil.setParameters(query, appQueryParamsDtoList);
                Map<Boolean, List<QueryResult>> map = CustomUtil.getResultList(query, QueryResult.class, appRuleQueryConditionsDto).stream().filter(Objects::nonNull).collect(Collectors.groupingBy(queryResult -> Boolean.parseBoolean(queryResult.getResult())));
                if (map.containsKey(Boolean.FALSE)) {
                    map.get(Boolean.FALSE).forEach(queryResult -> {
                        AppRuleErrorItemsDto appRuleErrorItemsDto = new AppRuleErrorItemsDto();
                        appRuleErrorItemsDto.setRuleId(appRulesDto.getId());
                        appRuleErrorItemsDto.setRuleName(appRulesDto.getName());
                        appRuleErrorItemsDto.setRuleDescription(appRulesDto.getDescription());
                        appRuleErrorItemsDto.setConditionId(appRuleQueryConditionsDto.getId());
                        appRuleErrorItemsDto.setConditionType(AppRuleQueryConditions.class.getSimpleName());
                        appRuleErrorItemsDto.setConditionOrder(appRuleQueryConditionsDto.getRuleOrder());
                        appRuleErrorItemsDto.setConditionExpression(appRuleQueryConditionsDto.getQuery());
                        BaseModel inArr = arr.stream().filter(baseModel -> Objects.equals(queryResult.getId(), ClassUtil.getFieldValue(FieldUtils.getField(baseModel.getClass(), (String)CustomUtil.toLowerCamel("ID"), (boolean)true), baseModel, true))).findFirst().orElse(null);
                        appRuleErrorItemsDto.setBatchIndex(inArr != null ? arr.indexOf(inArr) + 1 : 0);
                        appRuleErrorItemsDtoList.add(appRuleErrorItemsDto);
                    });
                }
            }));
        }
        catch (QueryException e) {
            this.logger.fatal(e);
            throw (RuntimeException)e.getCause();
        }
        finally {
            entityManager.getTransaction().rollback();
            entityManager.close();
        }
        return appRuleErrorItemsDtoList;
    }

    private List<AppRulesDto> getRuleList(Report report) {
        ArrayList<AppRulesDto> appRulesDtoList = new ArrayList<AppRulesDto>();
        Date date = Optional.ofNullable(report.getReportDate()).orElseGet(DateUtil::newDateTime);
        Long subsidiaryId = Optional.ofNullable(report.getSubsidiary()).map(AppSubsidiaryDto::getId).orElse(null);
        HashSet columns = new HashSet();
        Optional.ofNullable(this.systemsService.getCurrentOperation()).ifPresent(o -> Optional.ofNullable(o.getTable()).filter(t -> EnumUtils.isValidEnum(SubTables.class, (String)t.getName())).ifPresent(t -> Optional.ofNullable(this.subsidiaryTablesService.getTableByName(t.getName())).ifPresent(st -> CollectionUtils.emptyIfNull(st.getColumns()).stream().filter(c -> c.getFlag().equals(String.valueOf(NumberUtils.INTEGER_ZERO))).distinct().map(AppColumnsDto::getName).forEach(columns::add))));
        columns.removeAll(Collections.singleton(null));
        CollectionUtils.emptyIfNull(this.rulesService.getRuleList(this.session.getRequestPath(), this.session.getRequestMethod(), subsidiaryId, DateUtil.date(date))).forEach(appRulesDto -> {
            this.rulesService.fillConditions((AppRulesDto)appRulesDto, columns, new Status[0]);
            if (ListUtil.isNotEmpty(appRulesDto.getConditions()) || ListUtil.isNotEmpty(appRulesDto.getExpressionConditions()) || ListUtil.isNotEmpty(appRulesDto.getQueryConditions())) {
                appRulesDtoList.add((AppRulesDto)appRulesDto);
            }
        });
        return appRulesDtoList;
    }

    private boolean checkHasQueryCondition(List<AppRulesDto> appRulesDtoList) {
        return CollectionUtils.emptyIfNull(appRulesDtoList).stream().map(AppRulesDto::getQueryConditions).flatMap(Collection::stream).anyMatch(dto -> Strings.isNotBlank((String)dto.getQuery()));
    }

    private String organizeWhenCondition(String operator) {
        return "CONDITION." + operator + "(" + "LIST" + "," + " " + "BODY" + "," + " " + "RULE" + "," + " " + "REPORT" + ")";
    }

    private AppRuleErrorsDto ruleErrorsFromReport(Report report) {
        AppRuleErrorsDto appRuleErrorsDto = new AppRuleErrorsDto(report);
        Optional.ofNullable(this.appOperationsService.getOperation(this.session.getRequestMethod(), this.session.getRequestPath())).ifPresent(appOperationsDto -> {
            appRuleErrorsDto.setOperationId(appOperationsDto.getId());
            appRuleErrorsDto.setMethod(appOperationsDto.getMethod());
            appRuleErrorsDto.setUserId(this.session.getSessionUser().getId());
            appRuleErrorsDto.setSessionId(this.session.getSessionId());
            appRuleErrorsDto.setPath(appOperationsDto.getPath());
            appRuleErrorsDto.setTableName(this.systemsService.getCurrentOperation().getTable().getName());
        });
        return appRuleErrorsDto;
    }

    private /* synthetic */ void lambda$evaluate$3(Facts facts, AtomicInteger index, List appRulesDtoList, List appRuleErrorItemsDtoList, ExpressionParser expressionParser, Object object) {
        facts.put("BODY", object);
        AppRuleErrorItemsDto appRuleErrorItemsDto = new AppRuleErrorItemsDto();
        appRuleErrorItemsDto.setBatchIndex(index.getAndIncrement());
        appRulesDtoList.forEach(appRulesDto -> {
            appRuleErrorItemsDto.setRuleId(appRulesDto.getId());
            appRuleErrorItemsDto.setRuleName(appRulesDto.getName());
            appRuleErrorItemsDto.setRuleDescription(appRulesDto.getDescription());
            CollectionUtils.emptyIfNull(appRulesDto.getConditions()).forEach(appRuleConditionsDto -> {
                facts.put("RULE", appRuleConditionsDto);
                MVELRule rule = new MVELRule().name(appRulesDto.getName()).description(appRulesDto.getDescription()).when(this.organizeWhenCondition(CustomUtil.toLowerCamel(Operators.findByOperator(appRuleConditionsDto.getOperator()).name())));
                if (!rule.evaluate(facts)) {
                    AppRuleErrorItemsDto cloneAppRuleErrorItem = appRuleErrorItemsDto.toBuilder().build();
                    cloneAppRuleErrorItem.setConditionId(appRuleConditionsDto.getId());
                    cloneAppRuleErrorItem.setConditionType(AppRuleConditions.class.getSimpleName());
                    cloneAppRuleErrorItem.setConditionOrder(appRuleConditionsDto.getRuleOrder());
                    cloneAppRuleErrorItem.setConditionKey(appRuleConditionsDto.getKey());
                    cloneAppRuleErrorItem.setConditionOperator(appRuleConditionsDto.getOperator());
                    cloneAppRuleErrorItem.setConditionValue(appRuleConditionsDto.getValue());
                    appRuleErrorItemsDtoList.add(cloneAppRuleErrorItem);
                }
            });
            CollectionUtils.emptyIfNull(appRulesDto.getExpressionConditions()).forEach(appRuleExpressionConditionsDto -> {
                String exp = appRuleExpressionConditionsDto.getExpression();
                Matcher matcher = PatternConstants.DD_MM_YYYY.matcher(exp);
                Expression expression = expressionParser.parseExpression(exp = matcher.replaceAll("T(" + DateUtil.class.getCanonicalName() + ")" + "." + "date" + "(" + "$0" + ")"));
                Boolean result = (Boolean)expression.getValue(object, Boolean.class);
                if (result == null || !result.booleanValue()) {
                    AppRuleErrorItemsDto cloneAppRuleErrorItem = appRuleErrorItemsDto.toBuilder().build();
                    cloneAppRuleErrorItem.setConditionId(appRuleExpressionConditionsDto.getId());
                    cloneAppRuleErrorItem.setConditionType(AppRuleExpressionConditions.class.getSimpleName());
                    cloneAppRuleErrorItem.setConditionOrder(appRuleExpressionConditionsDto.getRuleOrder());
                    cloneAppRuleErrorItem.setConditionExpression(appRuleExpressionConditionsDto.getExpression());
                    appRuleErrorItemsDtoList.add(cloneAppRuleErrorItem);
                }
            });
        });
    }
}
