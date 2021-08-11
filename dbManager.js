const dbInfo = {
  UIResources: {
    name: "UIResources",
    lastestVersion: 1,
  },
  OfflineUpload: {
    name: "OfflineUpload",
    lastestVersion: 1,
  },
};

const dbUpgradeVersionInfo = {
  UIResources: {
    1: {
      tablesConfig: [
        {
          name: "requirements",
          config: { keyPath: "_id" },
          indexes: [
            {
              name: "name",
              key: "name",
              objectParam: {
                unique: false,
              },
            },
          ],
        },
      ],
    },
    2: {
      tablesConfig: [
        {
          name: "history",
          config: { keyPath: "_id" },
          indexes: [],
        },
      ],
    },
  },
  OfflineUpload: {
    1: {
      tablesConfig: [
        {
          name: "claims",
          config: { keyPath: "_id" },
          indexes: [],
        },
      ],
    },
  },
};

const dbManager = (dbName, version) => {
  let dbInfo = {};

  const getObjectStore = (db, tableName) => {
    var objectStore = db
      .transaction([tableName], "readwrite")
      .objectStore(tableName);

    return objectStore;
  };

  const attachCallbacks = (request, callback, method) => {
    request.onerror = function (event) {
      console.log(`Error occured in ${method}`);
      callback && callback(null);
    };
    request.onsuccess = function (event) {
      var data = event.target.result;
      callback && callback(data);
    };
  };

  const openDatabaseConnection = (
    upgradeCb = () => {},
    successCb = () => {}
  ) => {
    var request = window.indexedDB.open(dbName, version);
    request.onerror = function (event) {
      console.log("error occured while opening databse connection");
      throw new Error("Unable to connect");
    };
    request.onsuccess = function (event) {
      const db = event.target.result;
      dbInfo = {
        name: dbName,
        version: version,
        db: event.target.result,
      };
      db.onversionchange = function (event) {
        db.close();
        console.log(
          "A new version of databse found. Closing previous connection."
        );
      };
      successCb && successCb(event);
    };
    request.onupgradeneeded = function (event) {
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion;
      for (let version = oldVersion + 1; version <= newVersion; version++) {
        if (
          dbUpgradeVersionInfo[dbName] &&
          dbUpgradeVersionInfo[dbName][version] &&
          dbUpgradeVersionInfo[dbName][version].tablesConfig
        ) {
          var db = event.target.result;
          for (let tableConfig of dbUpgradeVersionInfo[dbName][version]
            .tablesConfig) {
            const store = db.createObjectStore(
              tableConfig.name,
              tableConfig.config
            );
            if (Array.isArray(tableConfig.indexes)) {
              for (let index of tableConfig.indexes) {
                store.createIndex(index.name, index.key, index.objectParam);
              }
            }
          }
        }
      }
      upgradeCb && upgradeCb(event);
    };
  };

  const addRecords = (tableName, records) => {
    const addAllRecord = (db, table, records) => {
      const objectStore = getObjectStore(db, table);
      for (let record of records) {
        objectStore.add(record);
      }
    };
    if (!dbInfo.db) {
      openDatabaseConnection(null, (evt) => {
        addAllRecord(evt.target.result, tableName, records);
      });
    } else {
      addAllRecord(dbInfo.db, tableName, records);
    }
  };

  const getRecord = (tableName, recordId, callback) => {
    const getRecordbyId = (db, tableName, recordId) => {
      const objectStore = getObjectStore(db, tableName);
      const request = objectStore.get(recordId);
      attachCallbacks(request, callback, "getRecord");
    };
    if (!dbInfo.db) {
      openDatabaseConnection(null, (evt) => {
        getRecordbyId(evt.target.result, tableName, recordId);
      });
    } else {
      getRecordbyId(dbInfo.db, tableName, recordId);
    }
  };

  const getAllrecords = (tableName, callback) => {
    const getAll = (db, tableName) => {
      var objectStore = getObjectStore(db, tableName);
      attachCallbacks(objectStore.getAll(), callback, "getAllrecords");
    };
    if (!dbInfo.db) {
      openDatabaseConnection(null, (evt) => {
        getAll(evt.target.result, tableName);
      });
    } else {
      getAll(dbInfo.db, tableName);
    }
  };

  const removeRecord = (tableName, recordId, callback) => {
    const removeRecordbyId = (db, tableName, recordId) => {
      var objectStore = getObjectStore(db, tableName);
      var request = objectStore.delete(recordId);
      attachCallbacks(request, callback, "removeRecord");
    };
    if (!dbInfo.db) {
      openDatabaseConnection(null, (evt) => {
        removeRecordbyId(evt.target.result, tableName, recordId);
      });
    } else {
      removeRecordbyId(dbInfo.db, tableName, recordId);
    }
  };

  const removeAll = (tableName, callback) => {
    const removeAllRecord = (db, tableName) => {
      var objectStore = getObjectStore(db, tableName);
      var request = objectStore.clear();
      attachCallbacks(request, callback, "removeAll");
    };
    if (!dbInfo.db) {
      openDatabaseConnection(null, (evt) => {
        removeAllRecord(evt.target.result, tableName);
      });
    } else {
      removeAllRecord(dbInfo.db, tableName);
    }
  };

  const getDbInfo = () => {
    return dbInfo;
  };

  return {
    openDatabaseConnection,
    getDbInfo,
    addRecords,
    getRecord,
    getAllrecords,
    removeRecord,
    removeAll,
  };
};

const manager = {
  UIResources: dbManager(
    dbInfo.UIResources.name,
    dbInfo.UIResources.lastestVersion
  ),
  OfflineUpload: dbManager(
    dbInfo.OfflineUpload.name,
    dbInfo.OfflineUpload.lastestVersion
  ),
};

// export default manager;
