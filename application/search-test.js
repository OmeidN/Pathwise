//example test data
const mockData = {
    success: true,
    count: 10,
    results: [
        {
            resource_id: 1,
            title: "Resume Writing Guide",
            description: "Step by step guide for writing a strong internship resume.",
            type: "resource",
            category_id: 2,
            category_name: "Career",
            tags: ["resume", "internship"],
            url: "https://example.com/resume",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 2,
            title: "Interview Prep Checklist",
            description: "Checklist covering common interview questions and preparation tips.",
            type: "resource",
            category_id: 2,
            category_name: "Career",
            tags: ["interview"],
            url: "https://example.com/interview",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 3,
            title: "Internship Search Strategy",
            description: "How to search, track applications, and follow up effectively.",
            type: "resource",
            category_id: 2,
            category_name: "Career",
            tags: ["internship"],
            url: "https://example.com/internships",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 4,
            title: "Weekly Study Plan Template",
            description: "A weekly schedule template for balancing classes and assignments.",
            type: "resource",
            category_id: 1,
            category_name: "Academic",
            tags: ["study"],
            url: "https://example.com/studyplan",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 5,
            title: "How to Use Office Hours",
            description: "Tips for getting the most value out of professor office hours.",
            type: "resource",
            category_id: 1,
            category_name: "Academic",
            tags: [],
            url: "https://example.com/officehours",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 6,
            title: "Note Taking Methods",
            description: "Overview of Cornell notes, outlining, and active recall strategies.",
            type: "resource",
            category_id: 1,
            category_name: "Academic",
            tags: [],
            url: "https://example.com/notetaking",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 7,
            title: "Budgeting Basics for Students",
            description: "Simple budgeting steps for managing money during the semester.",
            type: "resource",
            category_id: 3,
            category_name: "Personal",
            tags: [],
            url: "https://example.com/budgeting",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 8,
            title: "Goal Setting Starter Guide",
            description: "How to set realistic goals and track progress over time.",
            type: "resource",
            category_id: 3,
            category_name: "Personal",
            tags: [],
            url: "https://example.com/goals",
            image_path: null,
            is_ai_enabled: true,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 9,
            title: "Time Management Basics",
            description: "Prioritizing tasks using small routines to reduce stress.",
            type: "resource",
            category_id: 4,
            category_name: "Wellness",
            tags: ["time-management"],
            url: "https://example.com/time",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        },
        {
            resource_id: 10,
            title: "Stress Reset Techniques",
            description: "Short breathing and reset techniques for high stress moments.",
            type: "resource",
            category_id: 4,
            category_name: "Wellness",
            tags: ["wellness"],
            url: "https://example.com/stress",
            image_path: null,
            is_ai_enabled: false,
            created_at: "2026-03-06 00:57:39"
        }
    ]
};

const testEmptyData = {
  "success": true,
  "count": 0,
  "results": []
}

const testErrorMessage = {
  "success": false,
  "error": "DB error",
  "message": "Unable to process search request"
}

//configs
const config = {
    //swap to false when backend is ready
    useMock: false,
    apiEndpoint: '/api/search',
    //mock delay in ms
    mockDelay: 50
}

console.log("search-test.js loaded into DB");

//main event handler
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded and ready");

    //get dom elements
    const elements = {
        form: document.getElementById('searchForm'),
        input: document.getElementById('searchInput'),
        category: document.getElementById('category'),
        results: document.getElementById('resultsContent'),
        resultCount: document.getElementById('resultCount'),
        resetBtn: document.getElementById('resetBtn'),
        dataSource: document.getElementById('dataSource'),
        statusIndicator: document.getElementById('statusIndicator')
    };

    //make sure the elements actually exist
    let allElementsFound = true;
    for(const [name, element] of Object.entries(elements)){
        if(!element && name !== 'resultCount' && name !== 'dataSource' && name !== 'statusIndicator'){
            console.error(`ELEMENT IS MISSING: ${name}`);
            allElementsFound = false
        }
    }

    if(!allElementsFound){
        console.error("cannot proceed with missing elements");
        return;
    }

    console.log('all elements found');

    if(elements.dataSource){
        elements.dataSource.innerHTML = config.useMock ? 
            '<em>(using mock data)</em>' : 
            '<em>(connected to backend)</em>';
    }

    if(elements.statusIndicator){
        elements.statusIndicator.style.display = 'block';
        elements.statusIndicator.style.background = config.useMock ? '#fff3cd' : '#d4edda';
        elements.statusIndicator.textContent = config.useMock ? 
            'using mock data which means backend not yet implemented' : 
            'connected to live backend';
    }

    //get category ID from name in DB
    function getCategoryId(categoryName){
        const categoryMap = {
            'academic': 1,
            'career': 2, 
            'personal': 3,
            'wellness': 4
        };
        return categoryMap[categoryName] || null;
    }

    //get category ,name from ID in DB
    function getCategoryName(categoryId){
        const categoryMap = {
            1: 'academic',
            2: 'career',
            3: 'personal',
            4: 'wellness'
        };
        return categoryMap[categoryId] || 'other';
    }

    //visual update for testing
    function updateDisplay(data){
        console.log("updating display with:", data);
        
        //update pre elements
        elements.results.textContent = JSON.stringify(data, null, 2);
        
        //update result count
        if(elements.resultCount){
            elements.resultCount.textContent = `(${data.count} results)`;
        }
        
        //visual feedback
        elements.results.style.backgroundColor = '#9dc9ea';
        setTimeout(() => {
            elements.results.style.backgroundColor = '#f5f5f5';
        }, 200);
        
        console.log("display updated");
    }

    async function mockSearch(params){
        //use the mock delay for offline simulation
        await new Promise(resolve => setTimeout(resolve, config.mockDelay));
        
        //get params
        const searchTerm = params.get('q') || '';
        const categoryName = params.get('category') || '';
        const categoryId = getCategoryId(categoryName);

        console.log(`mock search: term="${searchTerm}", category="${categoryName}" (ID: ${categoryId})`);
        
        //edge cases
        if(searchTerm.toLowerCase() === 'error'){
            return testErrorMessage;
        }
        
        if (searchTerm.toLowerCase() === 'empty' || searchTerm === 'test-empty') {
            return testEmptyData;
        }
        
        //if no search term and no category, return empty results
        if(!searchTerm && !categoryName){
            console.log("empty search: returning 0 results");
            return{
                success: true,
                count: 0,
                results: [],
                _mock: true,
                _query: {searchTerm, categoryName},
                _note: "empty search returns 0 results"
            };
        }
        

        //filter only applicable results
        let filtered = [...mockData.results];
        
        if(searchTerm){
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(term) || 
                item.description.toLowerCase().includes(term) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }

        if(categoryId){
            filtered = filtered.filter(item => item.category_id === categoryId);
        }
        
        const results = filtered.map(item => ({
            resource_id: item.resource_id,
            title: item.title,
            description: item.description,
            type: item.type,
            category_id: item.category_id,
            category_name: item.category_name,
            tags: item.tags,
            url: item.url,
            image_path: item.image_path,
            is_ai_enabled: item.is_ai_enabled,
            created_at: item.created_at
        }));
        
        return{
            success: true,
            count: results.length,
            results: results,
            _mock: true,
            _query: {searchTerm, category: categoryName}
        };
    }

    //function search when backend is finished
    async function realSearch(params){
        const response = await fetch(`${config.apiEndpoint}?${params.toString()}`);
        if(!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    //form submit handler
    elements.form.addEventListener('submit', async function(e){
        e.preventDefault();
        
        console.log("form submiitted");
        
        const searchTerm = elements.input.value;
        const category = elements.category.value;
        
        //show loading
        elements.results.textContent = "Searching...";
        if(elements.resultCount) elements.resultCount.textContent = '';
        
        try{
            //build params
            const params = new URLSearchParams();
            if (searchTerm) params.append('q', searchTerm);
            if (category) params.append('category', category);
            
            //perform the search
            const data = config.useMock ? 
                await mockSearch(params) : 
                await realSearch(params);
            
            //update display
            updateDisplay(data);
            
        } 
        catch(error){
            console.error("search error:", error);
            elements.results.textContent = `error: ${error.message}`;
        }
    });

    //reset button handler
    elements.resetBtn.addEventListener('click', function(e){
        e.preventDefault();
        console.log("reset");
        
        elements.input.value = '';
        elements.category.value = '';
        elements.results.textContent = 'waiting for input';
        if (elements.resultCount) elements.resultCount.textContent = '';
    });
    console.log("all handlers attached: testing ready");
    console.log("try testing with: 'internship', 'resume', 'study', 'stress', or '123' for empty results");
});

