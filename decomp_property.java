/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  org.springframework.beans.factory.annotation.Autowired
 *  org.springframework.beans.factory.annotation.Value
 *  org.springframework.boot.logging.LogLevel
 *  org.springframework.stereotype.Component
 */
package com.linktera.rpadashboard.component.impl;

import com.linktera.rpadashboard.component.Property;
import com.linktera.rpadashboard.component.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.logging.LogLevel;
import org.springframework.stereotype.Component;

@Component
public class PropertyImpl
implements Property {
    @Autowired
    Session session;
    @Value(value="${app.env}")
    String env;
    @Value(value="${app.organization}")
    Long organizationId;
    @Value(value="${app.logging.level}")
    LogLevel loggingLevel;
    @Value(value="${app.version}")
    String version;
    @Value(value="${spring.mail.username}")
    String mailUsername;
    @Value(value="${spring.jpa.properties.hibernate.default_schema}")
    String defaultSchema;
    @Value(value="${async.corePoolSize}")
    int asyncCorePoolSize;
    @Value(value="${async.maxPoolSize}")
    int asyncMaxPoolSize;
    @Value(value="${async.queueCapacity}")
    int asyncQueueCapacity;

    @Override
    public String getEnvironment() {
        return this.env;
    }

    @Override
    public Long getOrganizationId() {
        return this.organizationId;
    }

    @Override
    public Long getSubsidiaryId() {
        return this.session.getSessionUser().getSubsidiaryId();
    }

    @Override
    public LogLevel getLoggingLevel() {
        return this.loggingLevel;
    }

    @Override
    public String getVersion() {
        return this.version;
    }

    @Override
    public String getMailUsername() {
        return this.mailUsername;
    }

    @Override
    public String getDefaultSchema() {
        return this.defaultSchema;
    }

    @Override
    public int getAsyncCorePoolSize() {
        return this.asyncCorePoolSize;
    }

    @Override
    public int getAsyncMaxPoolSize() {
        return this.asyncMaxPoolSize;
    }

    @Override
    public int getAsyncQueueCapacity() {
        return this.asyncQueueCapacity;
    }
}
