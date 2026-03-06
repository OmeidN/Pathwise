//example test data
const testData = {
    success: true,
    count: 6,
    results: [
        {
            id: 101,
            title: "Internship Search Guide",
            description: "A comprehensive guide to finding and applying for internships at SFSU and beyond.",
            type: "resource",
            category: "career",
            tags: ["internship", "career", "jobs", "networking"],
            url: "https://career.sfsu.edu/internships",
            imagePath: "/uploads/resources/internship-guide.jpg",
            isAiEnabled: false,
            createdAt: "2026-02-15T10:30:00Z"
        },
        {
            id: 102,
            title: "Resume Writing Template",
            description: "ATS-friendly resume template designed specifically for college students.",
            type: "template",
            category: "career",
            tags: ["resume", "career", "template", "ats"],
            createdBy: "SFSU Career Center",
            imagePath: "/uploads/templates/resume-template.jpg",
            isAiEnabled: false,
            createdAt: "2026-02-10T14:20:00Z"
        },
        {
            id: 103,
            title: "AI-Powered Study Planner",
            description: "Smart study schedule generator that adapts to your learning style and course load.",
            type: "resource",
            category: "academic",
            tags: ["study", "ai", "planning", "productivity"],
            url: "https://studyplanner.example.com",
            imagePath: "/uploads/resources/ai-planner.jpg",
            isAiEnabled: true,
            createdAt: "2026-02-18T09:15:00Z"
        },
        {
            id: 104,
            title: "Research Paper Workflow",
            description: "Step-by-step guide to writing research papers.",
            type: "workflow",
            category: "academic",
            tags: ["research", "writing", "paper"],
            createdBy: "Dr. Smith",
            imagePath: null,
            isAiEnabled: false,
            createdAt: "2026-02-20T11:00:00Z"
        },
        {
            id: 105,
            title: "Stress Management Techniques",
            description: "Learn to manage stress during exams.",
            type: "resource",
            category: "personal",
            tags: ["stress", "wellness", "mental health"],
            url: "https://example.com/stress",
            imagePath: null,
            isAiEnabled: false,
            createdAt: "2026-02-22T09:30:00Z"
        },
        {
            id: 106,
            title: "Job Interview Tips Template",
            description: "Prepare for your job interviews with these tips.",
            type: "template",
            category: "career",
            tags: ["interview", "jobs", "career"],
            createdBy: "Career Center",
            imagePath: null,
            isAiEnabled: false,
            createdAt: "2026-02-25T14:15:00Z"
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
    //swap when backend is ready
    useMock: true,
    apiEndpoint: '/api/search',
    //mock delay in ms
    mockDelay: 200
}

console.log("search-test.js loaded into html page");

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

    //visual update for testing
    function updateDisplay(data){
        console.log("📝 Updating display with:", data);
        
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
        const category = params.get('category') || '';
        
        console.log(`mock search: term = "${searchTerm}", category = "${category}"`);
        
        //filter only applicable results
        let filtered = [...testData.results];
        
        if(searchTerm){
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(term) || 
                item.description.toLowerCase().includes(term) ||
                (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
            );
        }

        //return empty results with no category or search
        if (!searchTerm && !category) {
            console.log("empty search: returning 0 results");
            return {
                success: true,
                count: 0,
                results: [],
                _mock: true,
                _query: {searchTerm, category},
                _note: "empty search returns 0 results"
            };
        }
        
        if(category){
            filtered = filtered.filter(item => item.category === category);
        }
        
        return{
            success: true,
            count: filtered.length,
            results: filtered,
            _mock: true,
            _query: {searchTerm, category}
        };
    }

    //function search when backend is finished
    async function realSearch(params){
        const response = await fetch(`${config.apiEndpoint}?${params.toString()}`);
        if(!response.ok){
            throw new Error(`http error! status: ${response.status}`);
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
    console.log("all handlers attached: tesdting ready");
    console.log("try testing with: 'internship', 'resume', 'study', 'stress', or '123' for empty results");
});

