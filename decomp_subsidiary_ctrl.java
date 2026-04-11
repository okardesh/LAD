/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  com.jfilter.filter.FieldFilterSetting
 *  io.swagger.annotations.Api
 *  io.swagger.annotations.ApiOperation
 *  io.swagger.annotations.ApiParam
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.data.domain.Pageable
 *  org.springframework.http.HttpStatus
 *  org.springframework.web.bind.annotation.DeleteMapping
 *  org.springframework.web.bind.annotation.GetMapping
 *  org.springframework.web.bind.annotation.PathVariable
 *  org.springframework.web.bind.annotation.PostMapping
 *  org.springframework.web.bind.annotation.PutMapping
 *  org.springframework.web.bind.annotation.RequestBody
 *  org.springframework.web.bind.annotation.RequestMapping
 *  org.springframework.web.bind.annotation.RestController
 */
package biz.linktera.rpadashboard.controller;

import biz.linktera.rpadashboard.service.SubsidiaryService;
import com.jfilter.filter.FieldFilterSetting;
import com.linktera.rpadashboard.annotation.AppController;
import com.linktera.rpadashboard.component.Session;
import com.linktera.rpadashboard.criteria.SearchCriteria;
import com.linktera.rpadashboard.dto.AppSubsidiaryDto;
import com.linktera.rpadashboard.enums.ApprovalStatus;
import com.linktera.rpadashboard.enums.Error;
import com.linktera.rpadashboard.exception.GeneralException;
import com.linktera.rpadashboard.exception.ValidationException;
import com.linktera.rpadashboard.request.AppSubsidiaryRequest;
import com.linktera.rpadashboard.request.common.ListRequest;
import com.linktera.rpadashboard.response.AppSubsidiaryResponse;
import com.linktera.rpadashboard.specification.AppSubsidiarySpecification;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import java.util.ArrayList;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value={"/v1/subsidiary"})
@AppController(table="APP_SUBSIDIARY", service=SubsidiaryService.class)
@Api(description="Everything about subsidiary operations.")
public class SubsidiaryController {
    @Autowired
    SubsidiaryService subsidiaryService;
    @Autowired
    Session session;

    @GetMapping
    @ApiOperation(value="List of subsidiary", notes="Subsidiaries are fetched as a list.", response=AppSubsidiaryResponse.class)
    public AppSubsidiaryResponse getSubsidiaryList(@ApiParam(name="List Request", value="Required filter parameters are taken.", required=true) @RequestBody ListRequest req) {
        if (req == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiarySpecification spec = new AppSubsidiarySpecification(req.getSearch());
        Pageable pageable = req.getPageable();
        return new AppSubsidiaryResponse(this.subsidiaryService.getList(spec, pageable));
    }

    @GetMapping(value={"/{uuid}"})
    @ApiOperation(value="Subsidiary details.", notes="Subsidiary details are fetched.", response=AppSubsidiaryResponse.class)
    public AppSubsidiaryResponse getSubsidiary(@ApiParam(name="UUID", value="UUID of subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto appSubsidiaryDto = (AppSubsidiaryDto)this.subsidiaryService.get(uuid);
        if (appSubsidiaryDto != null) {
            appSubsidiaryDto.setHistory(this.subsidiaryService.getHistoryByUuid(uuid));
        }
        return new AppSubsidiaryResponse(appSubsidiaryDto);
    }

    @PostMapping
    @ApiOperation(value="New subsidiary.", notes="New subsidiary is created.")
    public void saveSubsidiary(@ApiParam(name="AppSubsidiaryRequest", value="A request is filled in for subsidiary created.", required=true) @RequestBody AppSubsidiaryRequest req) {
        if (req == null || req.getSubsidiary() == null) {
            throw new ValidationException(Error.ERR005);
        }
        if (req.getSubsidiary() != null) {
            req.getSubsidiary().setApprovalStatus(ApprovalStatus.APPROVAL.getCode());
            this.subsidiaryService.save(req.getSubsidiary());
        }
    }

    @PutMapping(value={"/{uuid}"})
    @ApiOperation(value="Subsidiary update.", notes="Subsidiary update process is performed.")
    public void updateSubsidiary(@ApiParam(name="AppSubsidiaryRequest", value="The updated fields are retrieved for subsidiary to be updated.", required=true) @RequestBody AppSubsidiaryRequest req, @ApiParam(name="UUID", value="UUID of updated subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (req == null || req.getSubsidiary() == null || uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto appSubsidiaryDto = req.getSubsidiary();
        this.subsidiaryService.update(uuid, appSubsidiaryDto);
    }

    @PostMapping(value={"/{uuid}/cancel"})
    @ApiOperation(value="Approval status cancel.", notes="Canceling the subsidiary.")
    public void cancelApprovalAppSubsidiaries(@ApiParam(name="AppSubsidiaryRequest", value="The updated fields are retrieved for subsidiary to be updated.", required=true) @RequestBody AppSubsidiaryRequest req, @ApiParam(name="UUID", value="UUID of updated subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (req == null || req.getSubsidiary() == null || uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto inDb = (AppSubsidiaryDto)this.subsidiaryService.get(uuid);
        if (!inDb.getApprovalStatus().equals(ApprovalStatus.NEW.getCode()) && !inDb.getApprovalStatus().equals(ApprovalStatus.REJECT.getCode())) {
            throw new GeneralException(HttpStatus.GONE.value(), inDb.getUuid().toString());
        }
        AppSubsidiaryDto appSubsidiaryDto = req.getSubsidiary();
        appSubsidiaryDto.setApprovalStatus(ApprovalStatus.CANCEL.getCode());
        this.subsidiaryService.updateApprovalStatus(uuid, appSubsidiaryDto);
    }

    @PostMapping(value={"/{uuid}/sendForApproval"})
    @ApiOperation(value="Send for approval subsidiary.", notes="Send the subsidiary for approval.")
    public void sendForApprovalAppSubsidiaries(@ApiParam(name="AppSubsidiaryRequest", value="The updated fields are retrieved for subsidiary to be updated.", required=true) @RequestBody AppSubsidiaryRequest req, @ApiParam(name="UUID", value="UUID of updated subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (req == null || req.getSubsidiary() == null || uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto appSubsidiaryDto = req.getSubsidiary();
        appSubsidiaryDto.setApprovalStatus(ApprovalStatus.WAITING.getCode());
        this.subsidiaryService.updateApprovalStatus(uuid, appSubsidiaryDto);
    }

    @PostMapping(value={"/{uuid}/reject"})
    @ApiOperation(value="Approval status reject.", notes="Rejecting the subsidiary.")
    public void rejectApprovalAppSubsidiaries(@ApiParam(name="AppSubsidiaryRequest", value="The updated fields are retrieved for subsidiary to be updated.", required=true) @RequestBody AppSubsidiaryRequest req, @ApiParam(name="UUID", value="UUID of updated subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (req == null || req.getSubsidiary() == null || uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto appSubsidiaryDto = req.getSubsidiary();
        appSubsidiaryDto.setApprovalStatus(ApprovalStatus.REJECT.getCode());
        this.subsidiaryService.updateApprovalStatus(uuid, appSubsidiaryDto);
    }

    @PostMapping(value={"/{uuid}/approve"})
    @ApiOperation(value="Approval status approve.", notes="Approving the subsidiary.")
    public void approveAppSubsidiaries(@ApiParam(name="AppSubsidiaryRequest", value="The updated fields are retrieved for subsidiary to be updated.", required=true) @RequestBody AppSubsidiaryRequest req, @ApiParam(name="UUID", value="UUID of updated subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (req == null || req.getSubsidiary() == null || uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        AppSubsidiaryDto inDb = (AppSubsidiaryDto)this.subsidiaryService.get(uuid);
        if (inDb.getLastUpdatedBy().equals(this.session.getSessionUser().getId())) {
            throw new GeneralException(HttpStatus.CONFLICT.value(), inDb.getUuid().toString());
        }
        AppSubsidiaryDto appSubsidiaryDto = req.getSubsidiary();
        appSubsidiaryDto.setApprovalStatus(ApprovalStatus.APPROVAL.getCode());
        this.subsidiaryService.updateApprovalStatus(uuid, appSubsidiaryDto);
    }

    @DeleteMapping(value={"/{uuid}"})
    @ApiOperation(value="Subsidiary delete", notes="Subsidiary delete process is performed.")
    public void deleteSubsidiary(@ApiParam(name="UUID", value="UUID of deleted subsidiary that needs to be fetched.", required=true) @PathVariable(value="uuid") UUID uuid) {
        if (uuid == null) {
            throw new ValidationException(Error.ERR005);
        }
        this.subsidiaryService.delete(uuid);
    }

    @FieldFilterSetting(fields={"organizationId", "createdBy", "creator", "createdTime", "lastUpdatedBy", "lastUpdater", "lastUpdatedTime"})
    @GetMapping(value={"/limited"})
    @ApiOperation(value="Limited subsidiary list.", notes="Generate list of filterable fields from response object.")
    public AppSubsidiaryResponse getLimitedSubsidiaryList() {
        ArrayList<SearchCriteria> criteriaList = new ArrayList<SearchCriteria>();
        criteriaList.add(new SearchCriteria("approvalStatus", "=", ApprovalStatus.APPROVAL.getCode()));
        return new AppSubsidiaryResponse(this.subsidiaryService.findByCriteria(criteriaList));
    }
}
