/* eslint-disable no-unused-vars */

// 브라우저 호환성
if (typeof browser === 'undefined') {
  var browser = chrome;
}

class TTLCacheStats {
  constructor(name) {
    this.name = name;
    this.stats = null;
    this.saveTimer = null;
    this.saving = false;
  }

  async forceLoad() {
    try {
      const data = await browser.storage.local.get('stats');
      this.stats = data.stats || {};
      if (!this.stats[this.name]) {
        this.stats[this.name] = {};
      }
    } catch (error) {
      console.error(`Error loading ${this.name} stats:`, error);
      this.stats = { [this.name]: {} };
    }
  }

  async load() {
    if (this.stats === null) {
      await this.forceLoad();
    }
  }

  async save() {
    // 중복 저장 방지
    if (this.saving) {
      return;
    }

    // 디바운스 처리
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(async () => {
      try {
        this.saving = true;
        const clone = { ...this.stats[this.name] }; // 얕은 복사
        console.log('Saving stats...', clone);
        
        await this.forceLoad(); // 최신 데이터 로드
        this.stats[this.name] = clone; // 업데이트
        
        await browser.storage.local.set({ stats: this.stats });
      } catch (error) {
        console.error(`Error saving ${this.name} stats:`, error);
      } finally {
        this.saving = false;
        this.saveTimer = null;
      }
    }, 1000);
  }

  async expired() {
    try {
      await this.load();
      if (!this.stats[this.name].last_check_date) {
        this.stats[this.name].last_check_date = Date.now();
        await this.save();
        log('Initialized stats date', this.stats[this.name].last_check_date);
        return;
      }

      const date_yesterday = Date.now() - 86400000; // 1day
      log('금일 로컬스토리지 정리를 완료하였습니다.');
      if (date_yesterday < this.stats[this.name].last_check_date) return;

      // 1주일이 지난 데이터 삭제
      const date_week_ago = Date.now() - 7 * 86400000;
      log('stats before deletion', this.stats);
      log('date a week ago', date_week_ago);

      Object.entries(this.stats[this.name]).forEach(([key, value]) => {
        if (!value || !value.save_date) {
          delete this.stats[this.name][key];
        } else {
          const save_date = new Date(value.save_date);
          if (date_week_ago > save_date) {
            delete this.stats[this.name][key];
          }
        }
      });

      this.stats[this.name].last_check_date = Date.now();
      log('stats after deletion', this.stats);
      await this.save();
    } catch (error) {
      console.error(`Error in expired check for ${this.name}:`, error);
    }
  }

  async update(data) {
    try {
      await this.expired();
      await this.load();
      
      this.stats[this.name][data.id] = {
        ...data,
        save_date: Date.now(),
      };
      
      log('date', this.stats[this.name][data.id].save_date);
      log('stats', this.stats);
      await this.save();
    } catch (error) {
      console.error(`Error updating ${this.name}:`, error);
    }
  }

  async get(id) {
    try {
      await this.load();
      const cur = this.stats[this.name];
      if (!cur || !cur[id]) return null;
      return cur[id];
    } catch (error) {
      console.error(`Error getting ${id} from ${this.name}:`, error);
      return null;
    }
  }
}

// 캐시 인스턴스 생성
const problemCache = new TTLCacheStats('problem');
const submitCodeCache = new TTLCacheStats('scode');
const SolvedACCache = new TTLCacheStats('solvedac');

// 문제 데이터 관련 함수들
async function updateProblemsFromStats(problem) {
  try {
    const data = {
      id: problem.problemId,
      problem_description: problem.problem_description,
      problem_input: problem.problem_input,
      problem_output: problem.problem_output,
    };
    await problemCache.update(data);
  } catch (error) {
    console.error('Error updating problem stats:', error);
  }
}

async function getProblemFromStats(problemId) {
  try {
    return await problemCache.get(problemId);
  } catch (error) {
    console.error('Error getting problem stats:', error);
    return null;
  }
}

// 제출 코드 관련 함수들
async function updateSubmitCodeFromStats(obj) {
  try {
    const data = {
      id: obj.submissionId,
      data: obj.code,
    };
    await submitCodeCache.update(data);
  } catch (error) {
    console.error('Error updating submit code:', error);
  }
}

async function getSubmitCodeFromStats(submissionId) {
  try {
    const result = await submitCodeCache.get(submissionId);
    return result?.data;
  } catch (error) {
    console.error('Error getting submit code:', error);
    return null;
  }
}

// SolvedAC 관련 함수들
async function updateSolvedACFromStats(obj) {
  try {
    const data = {
      id: obj.problemId,
      data: obj.jsonData,
    };
    await SolvedACCache.update(data);
  } catch (error) {
    console.error('Error updating SolvedAC data:', error);
  }
}

async function getSolvedACFromStats(problemId) {
  try {
    const result = await SolvedACCache.get(problemId);
    return result?.data;
  } catch (error) {
    console.error('Error getting SolvedAC data:', error);
    return null;
  }
}