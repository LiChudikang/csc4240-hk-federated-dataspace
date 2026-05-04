/*
 *  Copyright (c) 2026 CSC4240 Final Project Team
 *
 *  This program and the accompanying materials are made available under the
 *  terms of the Apache License, Version 2.0 which is available at
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 *  SPDX-License-Identifier: Apache-2.0
 */

package org.eclipse.edc.demo.dcp.policy;

import org.eclipse.edc.participant.spi.ParticipantAgentPolicyContext;
import org.eclipse.edc.policy.engine.spi.AtomicConstraintRuleFunction;
import org.eclipse.edc.policy.model.Duty;
import org.eclipse.edc.policy.model.Operator;

import java.util.Set;

/**
 * Custom ODRL DUTY constraint added by the CSC4240 final project team.
 *
 * <p>Encodes the academic policy requirement from the proposal: the consumer
 * MUST attribute the data source. The right operand carries the required
 * attribution string (e.g. "HK Transport Hub"); the duty fires only for
 * approved attribution strings recognised by this dataspace.
 *
 * <p>Together with {@link ParticipantTierFunction}, this proves that the
 * dataspace can extend EDC's policy engine with both PERMISSION rules
 * (who is allowed) and DUTY rules (what they must do).
 *
 * <p>Usage in an ODRL Set:
 * <pre>
 *   "duty": [{
 *     "action": "use",
 *     "constraint": {
 *       "leftOperand": "attribution",
 *       "operator": "eq",
 *       "rightOperand": "HK Transport Hub"
 *     }
 *   }]
 * </pre>
 */
public class AttributionDutyFunction<C extends ParticipantAgentPolicyContext>
        extends AbstractCredentialEvaluationFunction
        implements AtomicConstraintRuleFunction<Duty, C> {

    public static final String CONSTRAINT_KEY = "attribution";

    private static final Set<String> APPROVED_ATTRIBUTIONS = Set.of(
            "HK Transport Hub",
            "KMB",
            "MTR Corporation",
            "HK Transport Department",
            "HKU Transport Lab"
    );

    private AttributionDutyFunction() {
    }

    public static <C extends ParticipantAgentPolicyContext> AttributionDutyFunction<C> create() {
        return new AttributionDutyFunction<>() {
        };
    }

    @Override
    public boolean evaluate(Operator operator, Object rightOperand, Duty duty, C policyContext) {
        if (!operator.equals(Operator.EQ)) {
            policyContext.reportProblem(
                    "Cannot evaluate operator %s for attribution duty; only EQ is supported".formatted(operator));
            return false;
        }
        if (rightOperand == null) {
            policyContext.reportProblem("attribution rightOperand must not be null");
            return false;
        }

        var attribution = rightOperand.toString();
        if (!APPROVED_ATTRIBUTIONS.contains(attribution)) {
            policyContext.reportProblem(
                    "Attribution '%s' is not in the approved list %s".formatted(attribution, APPROVED_ATTRIBUTIONS));
            return false;
        }

        // Duty satisfied: the consumer commits to attribute one of the approved sources.
        // Real-world enforcement would happen at publication time (out-of-band audit);
        // this function gates whether the duty CAN be accepted in the contract.
        return true;
    }
}
