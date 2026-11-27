-- Isolated proposal, never auto-applied. All timestamps are UTC Unix seconds.
CREATE TABLE imperial_incidents (
 code TEXT PRIMARY KEY CHECK(length(code) BETWEEN 1 AND 80),
 severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
 state TEXT NOT NULL CHECK(state IN ('open','acknowledged','resolved')),
 generation INTEGER NOT NULL CHECK(generation>=1),
 revision INTEGER NOT NULL CHECK(revision>=1),
 observed_at INTEGER NOT NULL,
 opened_at INTEGER NOT NULL,
 acknowledged_by TEXT,
 acknowledged_at INTEGER,
 resolved_at INTEGER
);
CREATE TABLE imperial_incident_audit (
 code TEXT NOT NULL REFERENCES imperial_incidents(code),
 revision INTEGER NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('opened','severity_changed','acknowledged','resolved','reopened')),
 actor TEXT NOT NULL,
 at INTEGER NOT NULL,
 PRIMARY KEY(code,revision)
);
CREATE TRIGGER imperial_incident_insert AFTER INSERT ON imperial_incidents BEGIN
 INSERT INTO imperial_incident_audit VALUES(NEW.code,NEW.revision,'opened','system',NEW.opened_at);
END;
CREATE TRIGGER imperial_incident_update AFTER UPDATE ON imperial_incidents WHEN NEW.revision>OLD.revision BEGIN
 INSERT INTO imperial_incident_audit VALUES(NEW.code,NEW.revision,
 CASE WHEN NEW.state='resolved' THEN 'resolved' WHEN NEW.state='acknowledged' AND OLD.state<>'acknowledged' THEN 'acknowledged' WHEN OLD.state='resolved' THEN 'reopened' ELSE 'severity_changed' END,
 CASE WHEN NEW.state='acknowledged' AND OLD.state<>'acknowledged' THEN NEW.acknowledged_by ELSE 'system' END,
 CASE WHEN NEW.state='acknowledged' AND OLD.state<>'acknowledged' THEN NEW.acknowledged_at ELSE NEW.observed_at END);
END;
CREATE TABLE imperial_policy_sets (
 id TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1),
 actor TEXT NOT NULL, term TEXT NOT NULL, reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 500),
 created_at INTEGER NOT NULL, rules TEXT NOT NULL CHECK(json_valid(rules)),
 PRIMARY KEY(id,revision)
);
CREATE TRIGGER imperial_policy_immutable_update BEFORE UPDATE ON imperial_policy_sets BEGIN SELECT RAISE(ABORT,'immutable policy'); END;
CREATE TRIGGER imperial_policy_immutable_delete BEFORE DELETE ON imperial_policy_sets BEGIN SELECT RAISE(ABORT,'immutable policy'); END;
CREATE VIEW imperial_policy_current AS SELECT p.* FROM imperial_policy_sets p WHERE revision=(SELECT max(revision) FROM imperial_policy_sets x WHERE x.id=p.id);
CREATE TABLE imperial_exploration_steps (
 member TEXT NOT NULL, secret TEXT NOT NULL, step INTEGER NOT NULL CHECK(step>=1), evidence TEXT NOT NULL,
 discovered_at INTEGER NOT NULL, PRIMARY KEY(member,secret,step), UNIQUE(member,secret,evidence)
);
CREATE TABLE imperial_exploration_completions (
 member TEXT NOT NULL, secret TEXT NOT NULL, completed_at INTEGER NOT NULL,
 PRIMARY KEY(member,secret)
);
